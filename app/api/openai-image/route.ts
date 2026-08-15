import { requireApiKey } from "../../server/secrets";
import { fetchUpstream, isTimeout } from "../../server/http";
import { framingFor, presenterBrief, type Pipeline } from "../../server/image-framing";
import { allowHeadlineText, headlineDirective } from "../../server/headline";

type ImageRequest = {
  pipeline?: Pipeline;
  model?: string;
  quality?: "low" | "medium" | "high";
  prompt?: string;
  overlay?: string;
  channel?: string;
  systemPrompt?: string;
  referenceKeys?: string[];
  presenterKey?: string;
};

const ALLOWED_MODELS = new Set(["gpt-image-2", "gpt-image-1.5"]);

function referencePrefix(userId: string) {
  return `reference-thumbnails/${encodeURIComponent(userId)}/`;
}

export async function POST(request: Request) {
  const guard = await requireApiKey("openai");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as ImageRequest;

  const pipeline: Pipeline = body.pipeline === "shorts" ? "shorts" : "script";
  const model = body.model?.trim() ?? "gpt-image-2";
  const prompt = body.prompt?.trim() ?? "";
  if (!ALLOWED_MODELS.has(model)) return Response.json({ error: "unsupported_image_model" }, { status: 400 });
  if (!prompt || prompt.length > 8_000) return Response.json({ error: "invalid_image_prompt" }, { status: 400 });
  const framing = framingFor(pipeline, model);

  const presenterKey = typeof body.presenterKey === "string" && body.presenterKey ? body.presenterKey : "";
  const editorialSystem = body.systemPrompt?.trim().slice(0, 12_000);
  const overlay = (body.overlay ?? "").slice(0, 80);
  const channel = (body.channel ?? "").slice(0, 80);
  // The presenter photo and the style references are both uploaded images but serve
  // opposite purposes, so each is named: copy the face, never copy a thumbnail. The
  // presenter instruction comes last and overrides, because an editorial system prompt
  // written for generic stock people would otherwise erase the channel's own face.
  const styleBrief = "The thumbnail reference images show the channel's recurring visual language: match their style, never copy a particular thumbnail's composition.";
  // With a headline to render, the concept's own ban on lettering is stripped and the
  // headline is stated as an override — the composed prompt used to ask for a large
  // headline one line after forbidding every letter.
  const scene = overlay ? allowHeadlineText(prompt) : prompt;
  const noWords = overlay ? "" : " Do not add any words, logos, or watermarks.";
  const composedPrompt = `${editorialSystem ? `EDITORIAL SYSTEM TO FOLLOW:\n${editorialSystem}\n\n` : ""}${scene}\n${framing.brief} ${styleBrief}${noWords} Keep all essential faces, objects, and text inside a centered safe area.${overlay ? `\n\n${headlineDirective(overlay, channel)}` : ""}${presenterKey ? `\n\nOVERRIDING REQUIREMENT — THE PRESENTER: ${presenterBrief(pipeline)}` : ""}`;

  try {
    // The presenter photo travels as a reference image too, so the model can keep the
    // face faithful; it is listed first so it is the dominant human reference.
    // Style references compete with the presenter photo for the face: they are past
    // thumbnails, and the people in them are rendered, not photographed. The channel's
    // visual language already travels in words through the editorial system prompt, so
    // when a real face has to be preserved the image-side style budget is cut to two.
    const styleBudget = presenterKey ? 2 : 4;
    const requestedReferences = [...(presenterKey ? [presenterKey] : []), ...(body.referenceKeys ?? []).slice(0, styleBudget)];
    const size = framing.size;
    let response: Response;
    if (requestedReferences.length) {
      // Ownership check: a key outside this user's prefix is never fetched.
      const prefix = referencePrefix(userId);
      if (requestedReferences.some(key => !key.startsWith(prefix))) return Response.json({ error: "reference_forbidden" }, { status: 403 });
      // Resolved lazily so the route stays loadable outside workerd; only the
      // reference-image branch needs R2 at all.
      const { env } = await import("cloudflare:workers");
      const runtime = env as unknown as { BUCKET?: R2Bucket };
      if (!runtime.BUCKET) return Response.json({ error: "reference_storage_unavailable" }, { status: 503 });
      const objects = await Promise.all(requestedReferences.map(key => runtime.BUCKET!.get(key)));
      if (objects.some(object => !object)) return Response.json({ error: "reference_not_found" }, { status: 404 });
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", composedPrompt);
      form.append("size", size);
      form.append("quality", body.quality ?? "medium");
      form.append("output_format", framing.format);
      // gpt-image-2 processes every input at high fidelity and rejects the parameter;
      // gpt-image-1.5 defaults to low, which is what loses a face.
      if (model === "gpt-image-1.5") form.append("input_fidelity", "high");
      for (const [index, object] of objects.entries()) {
        const typedObject = object!;
        const contentType = typedObject.httpMetadata?.contentType ?? "image/jpeg";
        form.append("image[]", new Blob([await typedObject.arrayBuffer()], { type: contentType }), `reference-${index + 1}.${contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"}`);
      }
      response = await fetchUpstream("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: form, timeoutMs: 180_000 });
    } else {
      response = await fetchUpstream("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, prompt: composedPrompt, size, quality: body.quality ?? "medium", n: 1, output_format: framing.format }),
        timeoutMs: 180_000,
      });
    }
    const upstream = await response.json() as { data?: Array<{ b64_json?: string; revised_prompt?: string }>; error?: { message?: string } };
    if (!response.ok) return Response.json({ error: "openai_image_failed", detail: upstream.error?.message ?? "Image generation failed" }, { status: response.status === 401 ? 401 : 502 });
    const encoded = upstream.data?.[0]?.b64_json;
    if (!encoded) return Response.json({ error: "openai_image_missing" }, { status: 502 });
    return Response.json({ image: `data:${framing.mime};base64,${encoded}`, format: framing.extension, size, revisedPrompt: upstream.data?.[0]?.revised_prompt ?? null });
  } catch (error) {
    if (isTimeout(error)) return Response.json({ error: "openai_image_timeout" }, { status: 504 });
    return Response.json({ error: "openai_image_unreachable" }, { status: 502 });
  }
}
