type ImageRequest = {
  apiKey?: string;
  model?: string;
  quality?: "low" | "medium" | "high";
  prompt?: string;
  overlay?: string;
  channel?: string;
};

const ALLOWED_MODELS = new Set(["gpt-image-2", "gpt-image-1.5"]);

export async function POST(request: Request) {
  const body = await request.json() as ImageRequest;
  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim() ?? "gpt-image-2";
  const prompt = body.prompt?.trim() ?? "";
  if (!apiKey) return Response.json({ error: "openai_key_required" }, { status: 400 });
  if (!ALLOWED_MODELS.has(model)) return Response.json({ error: "unsupported_image_model" }, { status: 400 });
  if (!prompt || prompt.length > 8_000) return Response.json({ error: "invalid_image_prompt" }, { status: 400 });

  const composedPrompt = `${prompt}\nCreate a polished, photorealistic YouTube thumbnail in a 16:9 landscape composition. Reserve clean negative space for editorial typography. Add the exact large headline: "${(body.overlay ?? "").slice(0, 80)}". Add the small channel label: "${(body.channel ?? "").slice(0, 80)}". Do not add any other words, logos, or watermarks. Keep all essential faces, objects, and text inside a centered safe area.`;
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: composedPrompt,
        size: model === "gpt-image-2" ? "2048x1152" : "1536x1024",
        quality: body.quality ?? "medium",
        n: 1,
        output_format: "png",
      }),
    });
    const upstream = await response.json() as { data?: Array<{ b64_json?: string; revised_prompt?: string }>; error?: { message?: string } };
    if (!response.ok) return Response.json({ error: "openai_image_failed", detail: upstream.error?.message ?? "Image generation failed" }, { status: response.status === 401 ? 401 : 502 });
    const encoded = upstream.data?.[0]?.b64_json;
    if (!encoded) return Response.json({ error: "openai_image_missing" }, { status: 502 });
    return Response.json({ image: `data:image/png;base64,${encoded}`, revisedPrompt: upstream.data?.[0]?.revised_prompt ?? null });
  } catch {
    return Response.json({ error: "openai_image_unreachable" }, { status: 502 });
  }
}
