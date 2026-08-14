import { requireApiKey } from "../../server/secrets";
import { env } from "cloudflare:workers";

type ImageRequest = {
  model?: string;
  quality?: "low" | "medium" | "high";
  prompt?: string;
  overlay?: string;
  channel?: string;
  systemPrompt?: string;
  referenceKeys?: string[];
};

const ALLOWED_MODELS = new Set(["gpt-image-2", "gpt-image-1.5"]);

function referencePrefix(userId: string) {
  return `reference-thumbnails/${encodeURIComponent(userId)}/`;
}

export async function POST(request: Request) {
  const body = await request.json() as ImageRequest;
  const guard = await requireApiKey("openai");
  if (guard instanceof Response) return guard;
  const { apiKey } = guard;
  const model = body.model?.trim() ?? "gpt-image-2";
  const prompt = body.prompt?.trim() ?? "";
  if (!ALLOWED_MODELS.has(model)) return Response.json({ error: "unsupported_image_model" }, { status: 400 });
  if (!prompt || prompt.length > 8_000) return Response.json({ error: "invalid_image_prompt" }, { status: 400 });

  const editorialSystem = body.systemPrompt?.trim().slice(0, 12_000);
  const composedPrompt = `${editorialSystem ? `EDITORIAL SYSTEM TO FOLLOW:\n${editorialSystem}\n\n` : ""}${prompt}\nCreate a polished YouTube thumbnail in a 16:9 landscape composition. Use the uploaded reference thumbnails only to understand the recurring visual language; create an original composition and do not copy a particular thumbnail. Add the exact large headline: "${(body.overlay ?? "").slice(0, 80)}". Add the small channel label: "${(body.channel ?? "").slice(0, 80)}". Do not add any other words, logos, or watermarks. Keep all essential faces, objects, and text inside a centered safe area.`;
  try {
    const requestedReferences = (body.referenceKeys ?? []).slice(0, 4);
    let response: Response;
    if (requestedReferences.length) {
      const prefix = referencePrefix(guard.userId);
      if (requestedReferences.some(key => !key.startsWith(prefix))) return Response.json({ error: "reference_forbidden" }, { status: 403 });
      const runtime = env as unknown as { BUCKET?: R2Bucket };
      if (!runtime.BUCKET) return Response.json({ error: "reference_storage_unavailable" }, { status: 503 });
      const objects = await Promise.all(requestedReferences.map(key => runtime.BUCKET!.get(key)));
      if (objects.some(object => !object)) return Response.json({ error: "reference_not_found" }, { status: 404 });
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", composedPrompt);
      form.append("size", model === "gpt-image-2" ? "2048x1152" : "1536x1024");
      form.append("quality", body.quality ?? "medium");
      form.append("output_format", "png");
      for (const [index, object] of objects.entries()) {
        const typedObject = object!;
        const contentType = typedObject.httpMetadata?.contentType ?? "image/jpeg";
        form.append("image[]", new Blob([await typedObject.arrayBuffer()], { type: contentType }), `reference-${index + 1}.${contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"}`);
      }
      response = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: form });
    } else {
      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, prompt: composedPrompt, size: model === "gpt-image-2" ? "2048x1152" : "1536x1024", quality: body.quality ?? "medium", n: 1, output_format: "png" }),
      });
    }
    const upstream = await response.json() as { data?: Array<{ b64_json?: string; revised_prompt?: string }>; error?: { message?: string } };
    if (!response.ok) return Response.json({ error: "openai_image_failed", detail: upstream.error?.message ?? "Image generation failed" }, { status: response.status === 401 ? 401 : 502 });
    const encoded = upstream.data?.[0]?.b64_json;
    if (!encoded) return Response.json({ error: "openai_image_missing" }, { status: 502 });
    return Response.json({ image: `data:image/png;base64,${encoded}`, revisedPrompt: upstream.data?.[0]?.revised_prompt ?? null });
  } catch {
    return Response.json({ error: "openai_image_unreachable" }, { status: 502 });
  }
}
