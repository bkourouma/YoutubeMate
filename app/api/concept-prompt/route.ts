type RequestBody = {
  apiKey?: string;
  model?: string;
  language?: "fr" | "en";
  topic?: string;
  title?: string;
  overlay?: string;
  conceptName?: string;
  currentPrompt?: string;
  direction?: string;
  profile?: { channel?: string; theme?: string; thumbnailSystemPrompt?: string };
};

function normalizeApiKey(value?: string) {
  return value?.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "") ?? "";
}

function parseJsonContent(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced ?? content).trim();
  try { return JSON.parse(source) as Record<string, unknown>; } catch {
    const firstBrace = source.indexOf("{");
    const lastBrace = source.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) return JSON.parse(source.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    throw new Error("invalid_json");
  }
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as RequestBody;
  const apiKey = normalizeApiKey(body.apiKey);
  const model = typeof body.model === "string" ? body.model.trim().slice(0, 200) : "";
  const safe = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
  const title = safe(body.title, 300);
  const currentPrompt = safe(body.currentPrompt, 4_000);
  const language = body.language === "en" ? "English" : "French";
  if (!apiKey || !model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
  if (!title && !currentPrompt) return Response.json({ error: "invalid_request" }, { status: 400 });

  const direction = safe(body.direction, 1_500);
  const system = `You are a senior YouTube thumbnail art director. Return only valid JSON matching {"prompt":"..."}. Write ONE detailed English image-generation prompt for a 16:9 YouTube thumbnail: one clear focal subject, precise composition, cinematic lighting, high contrast, and generous negative space. The prompt must contain no text, no lettering, no logo, and no watermark, because headline text is added separately. Ground the scene strictly in the supplied video concept; never invent brand names, real people, statistics, or claims. Keep the prompt between 40 and 120 words.`;
  const user = `TOPIC: ${safe(body.topic, 300)}\nVIDEO TITLE: ${title}\nTHUMBNAIL HEADLINE (added separately, do not include): ${safe(body.overlay, 120)}\nCONCEPT NAME: ${safe(body.conceptName, 160)}\nCHANNEL: ${safe(body.profile?.channel, 200)} — ${safe(body.profile?.theme, 500)}\nTHUMBNAIL EDITORIAL SYSTEM: ${safe(body.profile?.thumbnailSystemPrompt, 4_000) || "Not defined"}\nCURRENT PROMPT:\n${currentPrompt || "None yet"}\n\nTASK: ${direction ? `Rewrite the current prompt applying this direction (it may be written in ${language}): ${direction}` : "Rewrite the current prompt into a stronger, more specific variant of the same concept."}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://script-studio-youtube.bkourouma.chatgpt.site/",
        "x-title": "Script Studio",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: "json_object" },
        plugins: [{ id: "response-healing" }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const upstream = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; usage?: unknown };
    if (!response.ok) return Response.json({ error: "openrouter_request_failed", detail: upstream.error?.message ?? "Request failed" }, { status: response.status === 401 ? 401 : 502 });
    const content = upstream.choices?.[0]?.message?.content;
    const prompt = content ? parseJsonContent(content).prompt : "";
    if (typeof prompt !== "string" || prompt.trim().length < 30) return Response.json({ error: "openrouter_invalid_prompt", detail: language === "English" ? "The model did not return a usable prompt." : "Le modèle n’a pas renvoyé de prompt exploitable." }, { status: 502 });
    return Response.json({ prompt: prompt.trim(), usage: upstream.usage ?? null });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (timedOut) return Response.json({ error: "openrouter_timeout", detail: language === "English" ? "Prompt regeneration exceeded the allowed time. Retry." : "La régénération du prompt a dépassé le délai autorisé. Réessayez." }, { status: 504 });
    return Response.json({ error: "openrouter_invalid_response", detail: error instanceof Error ? error.message : "Invalid response" }, { status: 502 });
  }
}
