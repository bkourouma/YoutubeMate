import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { descriptJobs } from "../../../db/schema";
import { requireApiKey } from "../../server/secrets";
import { fetchUpstream, isTimeout } from "../../server/http";
import { pollUntil, PollTimeoutError } from "../../server/poll";
import { publicOrigin } from "../../server/youtube";

const CTA_MEDIA_NAME = "SHORT CTA.mp4";
const PROMPT_VERSION = "youtubemate-v1";
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;
// Descript ids are opaque tokens; anything else is an attempt to reshape the URL.
const PROJECT_ID = /^[A-Za-z0-9_-]{1,64}$/;

type JobResult = { status?: string; error?: string; media_seconds_used?: number; ai_credits_used?: number; resolved_model?: string };
type JobStatus = { job_id?: string; job_state?: string; progress?: unknown; resolved_model?: string; result?: JobResult };
type AgentModel = { id?: string; name?: string; model?: string; cost?: string; cost_tier?: string; tier?: string };

const headersFor = (apiKey: string) => ({ authorization: `Bearer ${apiKey}` });

async function fetchJob(apiKey: string, jobId: string) {
  const response = await fetchUpstream(`https://descriptapi.com/v1/jobs/${encodeURIComponent(jobId)}`, { headers: headersFor(apiKey), timeoutMs: 20_000 });
  const job = await response.json().catch(() => ({})) as JobStatus & { message?: string; detail?: string; error?: string };
  return { response, job };
}

/** Waits for the CTA import only. Bounded by wall clock, not by attempt count. */
async function waitForJob(apiKey: string, jobId: string) {
  return pollUntil<JobStatus>(async () => {
    const { response, job } = await fetchJob(apiKey, jobId);
    if (!response.ok) throw new Error("cta_import_untrackable");
    if (job.job_state !== "stopped") return null;
    if (job.result?.status === "success") return job;
    throw new Error(job.result?.error || "cta_import_failed");
  }, { intervalMs: 1_500, deadlineMs: 90_000 });
}

async function ensureCtaMedia(apiKey: string, projectId: string, ctaUrl: string) {
  const projectResponse = await fetchUpstream(`https://descriptapi.com/v1/projects/${encodeURIComponent(projectId)}`, { headers: headersFor(apiKey), timeoutMs: 20_000 });
  if (!projectResponse.ok) throw new Error("descript_project_not_found");
  const project = await projectResponse.json() as { media?: Record<string, unknown>; media_files?: Record<string, unknown> };
  const mediaFiles = project.media_files ?? project.media ?? {};
  // Already imported once: never pay for the same media twice.
  if (Object.keys(mediaFiles).some(name => name.endsWith(CTA_MEDIA_NAME))) return { imported: false, mediaSecondsUsed: 0 };

  const importResponse = await fetchUpstream("https://descriptapi.com/v1/jobs/import/project_media", {
    method: "POST",
    headers: { ...headersFor(apiKey), "content-type": "application/json" },
    body: JSON.stringify({ project_id: projectId, add_media: { [CTA_MEDIA_NAME]: { url: ctaUrl, language: "fr" } } }),
    timeoutMs: 30_000,
  });
  const imported = await importResponse.json() as { job_id?: string; error?: string; message?: string };
  if (!importResponse.ok || !imported.job_id) throw new Error(imported.error || imported.message || "cta_import_rejected");
  const completed = await waitForJob(apiKey, imported.job_id);
  return { imported: true, jobId: imported.job_id, mediaSecondsUsed: Number(completed.result?.media_seconds_used) || 0 };
}

async function chooseLowCostModel(apiKey: string) {
  try {
    const response = await fetchUpstream("https://descriptapi.com/v1/agent/models", { headers: headersFor(apiKey), timeoutMs: 20_000 });
    if (!response.ok) return undefined;
    const catalog = await response.json() as AgentModel[] | { availableModels?: AgentModel[]; aliases?: AgentModel[]; models?: AgentModel[]; data?: AgentModel[] };
    const entries = Array.isArray(catalog) ? catalog : [...(catalog.availableModels ?? []), ...(catalog.aliases ?? []), ...(catalog.models ?? []), ...(catalog.data ?? [])];
    const models = entries.map(entry => ({ id: entry.id ?? entry.model ?? entry.name, cost: entry.cost ?? entry.cost_tier ?? entry.tier }))
      .filter((model): model is { id: string; cost: string | undefined } => Boolean(model.id));
    if (models.some(model => model.id === "claude-haiku-4.5")) return "claude-haiku-4.5";
    return models.find(model => model.cost?.toLowerCase() === "low")?.id;
  } catch {
    return undefined;
  }
}

async function fingerprint(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function findRecentJob(userId: string, key: string) {
  try {
    const [row] = await (await getDb()).select().from(descriptJobs)
      .where(and(eq(descriptJobs.userId, userId), eq(descriptJobs.key, key))).limit(1);
    if (!row) return null;
    return Date.now() - new Date(row.createdAt).getTime() < DEDUPE_WINDOW_MS ? row : null;
  } catch { return null; }
}

async function saveJob(userId: string, key: string, projectId: string, jobId: string, jobState: string, model: string, usage?: unknown) {
  try {
    const now = new Date().toISOString();
    await (await getDb()).insert(descriptJobs)
      .values({ userId, key, projectId, jobId, jobState, model, usagePayload: usage ? JSON.stringify(usage) : null, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: [descriptJobs.userId, descriptJobs.key], set: { jobId, jobState, model, usagePayload: usage ? JSON.stringify(usage) : null, updatedAt: now } });
  } catch { /* the ledger is a cost guard, not a dependency */ }
}

function descriptError(status: number) {
  if (status === 401 || status === 403) return "descript_unauthorized";
  if (status === 402) return "descript_insufficient_credits";
  if (status === 404) return "descript_project_not_found";
  if (status === 429) return "descript_rate_limited";
  return "descript_unavailable";
}

export async function GET(request: Request) {
  const guard = await requireApiKey("descript");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;
  const parameters = new URL(request.url).searchParams;

  if (parameters.get("action") === "composition_status") {
    const jobId = parameters.get("jobId") ?? "";
    if (!jobId) return Response.json({ error: "missing_job_id" }, { status: 400 });
    try {
      const { response, job } = await fetchJob(apiKey, jobId);
      if (response.status === 404) return Response.json({ error: "descript_job_not_found" }, { status: 404 });
      if (!response.ok) return Response.json({ error: descriptError(response.status) }, { status: 502 });
      const key = parameters.get("key");
      if (key) await saveJob(userId, key, parameters.get("projectId") ?? "", jobId, job.job_state ?? "unknown", job.resolved_model ?? "auto", job.result);
      return Response.json({
        job_id: job.job_id ?? jobId,
        job_state: job.job_state ?? "unknown",
        status: job.result?.status ?? null,
        result: job.result ?? null,
        resolved_model: job.resolved_model ?? null,
      });
    } catch (error) {
      if (isTimeout(error)) return Response.json({ error: "descript_timeout" }, { status: 504 });
      return Response.json({ error: "descript_unavailable" }, { status: 502 });
    }
  }

  try {
    const response = await fetchUpstream("https://descriptapi.com/v1/projects?limit=100", { headers: headersFor(apiKey), timeoutMs: 20_000 });
    if (!response.ok) return Response.json({ error: descriptError(response.status), projects: [] }, { status: 502 });
    const data = await response.json() as { projects?: Array<{ id?: string; name?: string; updated_at?: string }> } | Array<{ id?: string; name?: string; updated_at?: string }>;
    const list = Array.isArray(data) ? data : data.projects ?? [];
    const projects = list
      .filter(project => typeof project.id === "string")
      .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
      .map(project => ({ id: project.id, name: project.name ?? "Projet Descript", updatedAt: project.updated_at ?? null }));
    return Response.json({ projects });
  } catch (error) {
    if (isTimeout(error)) return Response.json({ error: "descript_timeout", projects: [] }, { status: 504 });
    return Response.json({ error: "descript_unavailable", projects: [] }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const guard = await requireApiKey("descript");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as { projectId?: string; action?: string; includeCtaVideo?: boolean; shorts?: Array<{ title?: string; text?: string; durationMinutes?: number; sequences?: Array<{ startTime?: string; endTime?: string }> }> };

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!PROJECT_ID.test(projectId)) return Response.json({ error: "invalid_project_id" }, { status: 400 });

  if (body.action !== "create_compositions") {
    // Transcript export.
    try {
      const exportTranscript = (format: "txt" | "srt") => fetchUpstream("https://descriptapi.com/v1/export/transcript", {
        method: "POST",
        headers: { ...headersFor(apiKey), "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId, format, include_speaker_labels: "changes" }),
        timeoutMs: 45_000,
      });
      const [plain, timed] = await Promise.all([exportTranscript("txt"), exportTranscript("srt")]);
      if (!plain.ok) return Response.json({ transcript: "", timedTranscript: "", error: descriptError(plain.status) }, { status: 502 });
      return Response.json({ transcript: await plain.text(), timedTranscript: timed.ok ? await timed.text() : "" });
    } catch (error) {
      if (isTimeout(error)) return Response.json({ error: "descript_timeout" }, { status: 504 });
      return Response.json({ error: "descript_unavailable" }, { status: 502 });
    }
  }

  const includeCtaVideo = body.includeCtaVideo !== false;
  const briefs = (Array.isArray(body.shorts) ? body.shorts : []).map((short, index) => ({
    numero: index + 1,
    titre: short.title || `Short ${index + 1}`,
    dureeMinutes: Math.min(3, Math.max(1, Number(short.durationMinutes) || 1)),
    sequences: (Array.isArray(short.sequences) ? short.sequences : []).map(sequence => ({ debut: sequence.startTime || "00:00", fin: sequence.endTime || "00:00" })),
    repere: String(short.text ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
  }));
  if (!briefs.length) return Response.json({ error: "no_compositions" }, { status: 400 });
  if (briefs.length > 50) return Response.json({ error: "too_many_compositions" }, { status: 400 });

  try {
    const ctaInstruction = includeCtaVideo
      ? `À la toute fin de chaque composition, ajoute le média vidéo « ${CTA_MEDIA_NAME} » en entier, une seule fois, sans le raccourcir ni le superposer au contenu principal.`
      : "N’ajoute aucun média CTA à la fin.";
    const prompt = `Dans ce projet, crée exactement ${briefs.length} nouvelles compositions verticales, sans altérer la composition source. Pour chaque élément, utilise uniquement toutes les plages de sequences, dans l’ordre fourni, sans les intervalles entre plages non consécutives. Les horodatages font foi; repere sert seulement à vérifier le bon passage. Nomme chaque composition avec son titre et conserve une narration naturelle. ${ctaInstruction}\n\nCOMPOSITIONS :\n${JSON.stringify(briefs)}`;

    const key = await fingerprint({ version: PROMPT_VERSION, projectId, includeCtaVideo, briefs });
    // An identical request inside the dedupe window must not re-run a paid agent job.
    const existing = await findRecentJob(userId, key);
    if (existing) {
      const { response: statusResponse, job } = await fetchJob(apiKey, existing.jobId);
      const successful = job.job_state === "stopped" && job.result?.status === "success";
      const active = job.job_state !== "stopped";
      if (!statusResponse.ok || active || successful) {
        return Response.json({ job_id: existing.jobId, request_key: key, requested_model: existing.model ?? "auto", deduplicated: true });
      }
    }

    const model = await chooseLowCostModel(apiKey);
    let ctaImport: { imported: boolean; jobId?: string; mediaSecondsUsed: number } = { imported: false, mediaSecondsUsed: 0 };
    if (includeCtaVideo) {
      // publicOrigin, never the request Host: Descript fetches this URL itself, so a
      // forged Host would point a third-party service at an attacker-chosen origin.
      ctaImport = await ensureCtaMedia(apiKey, projectId, `${publicOrigin(request)}/short-cta.mp4`);
    }

    const response = await fetchUpstream("https://descriptapi.com/v1/jobs/agent", {
      method: "POST",
      headers: { ...headersFor(apiKey), "content-type": "application/json" },
      body: JSON.stringify({ project_id: projectId, prompt, ...(model ? { model } : {}) }),
      timeoutMs: 45_000,
    });
    const data = await response.json().catch(() => ({})) as { job_id?: string };
    if (!response.ok) return Response.json({ error: descriptError(response.status) }, { status: 502 });
    if (!data.job_id) return Response.json({ error: "descript_missing_job_id" }, { status: 502 });
    await saveJob(userId, key, projectId, data.job_id, "queued", model ?? "auto");
    return Response.json({ job_id: data.job_id, request_key: key, requested_model: model ?? "auto", deduplicated: false, cta_import: ctaImport });
  } catch (error) {
    if (error instanceof PollTimeoutError) return Response.json({ error: "cta_import_timeout" }, { status: 504 });
    if (isTimeout(error)) return Response.json({ error: "descript_timeout" }, { status: 504 });
    const code = error instanceof Error ? error.message : "descript_unavailable";
    if (code === "public_origin_not_configured") return Response.json({ error: code }, { status: 503 });
    return Response.json({ error: code }, { status: 502 });
  }
}
