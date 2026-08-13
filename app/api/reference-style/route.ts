import { env } from "cloudflare:workers";
import { headers } from "next/headers";

type RequestBody = {
  apiKey?: string;
  model?: string;
  referenceKeys?: string[];
  currentPrompt?: string;
  instruction?: string;
  language?: "fr" | "en";
  profile?: { channel?: string; theme?: string; audience?: string; tone?: string };
};

function bucket() {
  const runtime = env as unknown as { BUCKET?: R2Bucket };
  if (!runtime.BUCKET) throw new Error("reference_storage_unavailable");
  return runtime.BUCKET;
}

async function userPrefix() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id") ?? "local-preview";
  return `reference-thumbnails/${encodeURIComponent(userId)}/`;
}

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim();
  const keys = (body.referenceKeys ?? []).slice(0, 4);
  if (!apiKey || !model) return Response.json({ error: "vision_configuration_required" }, { status: 400 });
  if (!keys.length) return Response.json({ error: "reference_required" }, { status: 400 });

  try {
    const prefix = await userPrefix();
    if (keys.some(key => !key.startsWith(prefix))) return Response.json({ error: "reference_forbidden" }, { status: 403 });
    const objects = await Promise.all(keys.map(key => bucket().get(key)));
    if (objects.some(object => !object)) return Response.json({ error: "reference_not_found" }, { status: 404 });
    const imageParts = await Promise.all(objects.map(async object => {
      const typedObject = object!;
      const contentType = typedObject.httpMetadata?.contentType ?? "image/jpeg";
      const encoded = Buffer.from(await typedObject.arrayBuffer()).toString("base64");
      return { type: "image_url", image_url: { url: `data:${contentType};base64,${encoded}` } };
    }));

    const outputLanguage = body.language === "en" ? "English" : "French";
    const currentPrompt = body.currentPrompt?.trim();
    const iteration = body.instruction?.trim();
    const task = currentPrompt
      ? `Improve the existing system prompt according to this user request: ${iteration || "Make it clearer, more operational, and more faithful to the references."}\n\nEXISTING SYSTEM PROMPT:\n${currentPrompt}`
      : "Analyze the reference thumbnails and create the first system prompt.";
    const analysisRequest = `${task}\n\nCHANNEL: ${body.profile?.channel ?? ""}\nTOPIC: ${body.profile?.theme ?? ""}\nAUDIENCE: ${body.profile?.audience ?? ""}\nTONE: ${body.profile?.tone ?? ""}\n\nReturn only the finished system prompt in ${outputLanguage}. It must be directly reusable before every thumbnail-generation prompt.`;
    const system = "You are a visual editorial director for YouTube. Infer a coherent, reusable visual system from all supplied reference thumbnails. Describe composition, hierarchy, typography, palette, contrast, lighting, recurring subjects, facial expression, cultural representation, negative space, brand placement, safe areas, and explicit do/don't rules. Abstract the style: never ask to copy a specific reference, person, logo, or protected artwork. Preserve useful user edits when iterating. Be concrete and operational.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "http-referer": "https://script-studio-youtube.bkourouma.chatgpt.site/", "x-title": "Script Studio" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: [{ type: "text", text: analysisRequest }, ...imageParts] }],
        temperature: 0.35,
        max_tokens: 2200,
      }),
    });
    const upstream = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) return Response.json({ error: "reference_analysis_failed", detail: upstream.error?.message ?? "Vision request failed" }, { status: response.status === 401 ? 401 : 502 });
    const prompt = upstream.choices?.[0]?.message?.content?.trim().replace(/^```(?:text|markdown)?\s*/i, "").replace(/```$/, "").trim();
    if (!prompt) return Response.json({ error: "reference_prompt_missing" }, { status: 502 });
    return Response.json({ prompt });
  } catch (error) {
    return Response.json({ error: "reference_analysis_unavailable", detail: error instanceof Error ? error.message : "Analysis unavailable" }, { status: 502 });
  }
}
