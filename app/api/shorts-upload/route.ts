import { withUser } from "../../server/identity";
import { getIntegrationSecret, integrationErrorResponse } from "../../server/secrets";
import { fetchUpstream, isTimeout } from "../../server/http";
import { pollUntil, PollTimeoutError } from "../../server/poll";
import { getAccessToken, YoutubeNotConnectedError } from "../../server/youtube";

const PROJECT_ID = /^[A-Za-z0-9_-]{1,64}$/;

type RequestBody = { projectId?: string; title?: string; description?: string; tags?: unknown };

/**
 * Uploads ONE short per request.
 *
 * The original looped over every short inside a single request, polling Descript up to
 * 150 × 2 s each and streaming the whole video through the Worker: ten shorts is close
 * to an hour in one request, which Workers will not hold — and a cut connection lost
 * every export already paid for. The client now drives the loop one short at a time and
 * resumes at the first one that has not landed, the same shape as chapter generation.
 */
export async function POST(request: Request) {
  return withUser(async userId => {
    let rawBody: unknown;
    try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
    const body = rawBody as RequestBody;

    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0).slice(0, 30) : [];
    if (!PROJECT_ID.test(projectId)) return Response.json({ error: "invalid_project_id" }, { status: 400 });
    if (!title || title.length > 100) return Response.json({ error: "invalid_title" }, { status: 400 });
    if (!description || description.length > 5000) return Response.json({ error: "invalid_description" }, { status: 400 });

    let descriptKey: string;
    let accessToken: string;
    try {
      descriptKey = await getIntegrationSecret("descript", userId);
    } catch (error) {
      return integrationErrorResponse(error) ?? Response.json({ error: "integration_not_configured", service: "descript" }, { status: 503 });
    }
    try {
      accessToken = await getAccessToken(userId);
    } catch (error) {
      if (error instanceof YoutubeNotConnectedError) return Response.json({ error: "youtube_not_connected" }, { status: 503 });
      return Response.json({ error: "youtube_token_unavailable" }, { status: 502 });
    }

    const descriptHeaders = { authorization: `Bearer ${descriptKey}` };
    try {
      // 1. Locate the composition. Matching is by exact name, so a rename in Descript
      //    surfaces as a clear error rather than uploading the wrong video.
      const projectResponse = await fetchUpstream(`https://descriptapi.com/v1/projects/${encodeURIComponent(projectId)}`, { headers: descriptHeaders, timeoutMs: 20_000 });
      if (!projectResponse.ok) return Response.json({ error: "descript_project_not_found" }, { status: 502 });
      const project = await projectResponse.json() as { compositions?: Array<{ id?: string; name?: string }> };
      const composition = (project.compositions ?? []).find(item => item.name === title);
      if (!composition?.id) return Response.json({ error: "composition_not_found", title }, { status: 404 });

      // 2. Ask Descript to render it.
      const publishResponse = await fetchUpstream("https://descriptapi.com/v1/jobs/publish", {
        method: "POST",
        headers: { ...descriptHeaders, "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, composition_id: composition.id, media_type: "Video", resolution: "1080p", access_level: "unlisted" }),
        timeoutMs: 30_000,
      });
      const publish = await publishResponse.json().catch(() => ({})) as { job_id?: string };
      if (!publishResponse.ok || !publish.job_id) return Response.json({ error: "descript_publish_failed" }, { status: 502 });

      // 3. Wait for the render, bounded by wall clock.
      const downloadUrl = await pollUntil<string>(async () => {
        const jobResponse = await fetchUpstream(`https://descriptapi.com/v1/jobs/${encodeURIComponent(publish.job_id as string)}`, { headers: descriptHeaders, timeoutMs: 20_000 });
        if (!jobResponse.ok) throw new Error("descript_publish_untrackable");
        const job = await jobResponse.json() as { job_state?: string; result?: { status?: string; download_url?: string; error?: string } };
        if (job.job_state !== "stopped") return null;
        if (job.result?.status !== "success" || !job.result.download_url) throw new Error(job.result?.error || "descript_publish_failed");
        return job.result.download_url;
      }, { intervalMs: 3_000, deadlineMs: 240_000, signal: request.signal });

      // 4. Open a resumable YouTube session, then stream Descript's file into it.
      const initResponse = await fetchUpstream("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", "x-upload-content-type": "video/mp4" },
        body: JSON.stringify({ snippet: { title, description, tags }, status: { privacyStatus: "private", selfDeclaredMadeForKids: false } }),
        timeoutMs: 30_000,
      });
      const uploadUrl = initResponse.headers.get("location");
      if (!initResponse.ok || !uploadUrl) return Response.json({ error: "youtube_session_failed" }, { status: 502 });

      const media = await fetchUpstream(downloadUrl, { timeoutMs: 120_000 });
      if (!media.ok || !media.body) return Response.json({ error: "descript_download_failed" }, { status: 502 });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": "video/mp4" },
        body: media.body,
        // Streaming a request body requires half duplex.
        duplex: "half",
      } as RequestInit & { duplex: "half" });
      const uploaded = await uploadResponse.json().catch(() => ({})) as { id?: string };
      if (!uploadResponse.ok || !uploaded.id) return Response.json({ error: "youtube_upload_failed" }, { status: 502 });

      // Always private: the owner reviews before anything becomes public.
      return Response.json({ videoId: uploaded.id, title, privacyStatus: "private" });
    } catch (error) {
      if (error instanceof PollTimeoutError) return Response.json({ error: "descript_render_timeout" }, { status: 504 });
      if (isTimeout(error)) return Response.json({ error: "upload_timeout" }, { status: 504 });
      return Response.json({ error: error instanceof Error ? error.message : "upload_failed" }, { status: 502 });
    }
  });
}
