type RequestBody = {
  apiKey?: string;
  model?: string;
  language?: "fr" | "en";
  inputType?: "script" | "description";
  subject?: string;
  source?: string;
  profile?: { channel?: string; theme?: string; audience?: string; tone?: string };
};

function parseJsonContent(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? content).trim());
}

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  const apiKey = body.apiKey?.trim();
  const source = body.source?.trim() ?? "";
  const model = body.model?.trim();
  if (!apiKey || !model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
  if (source.length < 80 || source.length > 120_000) return Response.json({ error: "invalid_source_length" }, { status: 400 });

  const language = body.language === "en" ? "English" : "French";
  const hasScript = body.inputType === "script";
  const schema = `{
    "topic": "short topic",
    "options": [{
      "id": "A",
      "register": "short positioning",
      "title": "YouTube title",
      "description": "A/B test description, 1-2 sentences",
      "overlay": "2-5 WORD THUMBNAIL HEADLINE",
      "concepts": [{"name":"short concept name","prompt":"detailed English image prompt"}]
    }],
    "improvedDescription": "complete YouTube description",
    "tags": ["tag"],
    "quiz": [{"question":"question","answer":"answer supported by the source"}]
  }`;
  const instructions = `You are a senior YouTube packaging strategist. Return only valid JSON matching this schema: ${schema}
Rules: write viewer-facing copy in ${language}; create exactly 3 options with ids A, B, C; each option must contain exactly 3 distinct thumbnail concepts; every image prompt must be in English, composed for a 16:9 YouTube thumbnail, high contrast, clear focal subject, no logo, no watermark, and no text because headline text is added separately; produce 8-15 relevant tags; never invent facts, figures, links, offers or promises not found in the source. ${hasScript ? "Create exactly 5 quiz questions and answers, with every answer strictly supported by the script." : "Return an empty quiz array."}`;
  const context = `CHANNEL: ${body.profile?.channel ?? ""}\nTHEME: ${body.profile?.theme ?? ""}\nAUDIENCE: ${body.profile?.audience ?? ""}\nTONE: ${body.profile?.tone ?? ""}\nSUBJECT: ${body.subject ?? ""}\nSOURCE TYPE: ${hasScript ? "script" : "description"}\nSOURCE:\n${source}`;

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
        messages: [{ role: "system", content: instructions }, { role: "user", content: context }],
        temperature: 0.7,
        max_tokens: 6000,
        response_format: { type: "json_object" },
      }),
    });
    const upstream = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; usage?: unknown };
    if (!response.ok) return Response.json({ error: "openrouter_request_failed", detail: upstream.error?.message ?? "Request failed" }, { status: response.status === 401 ? 401 : 502 });
    const content = upstream.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "openrouter_empty_response" }, { status: 502 });
    const result = parseJsonContent(content);
    return Response.json({ result, usage: upstream.usage ?? null });
  } catch (error) {
    return Response.json({ error: "openrouter_invalid_response", detail: error instanceof Error ? error.message : "Invalid response" }, { status: 502 });
  }
}
