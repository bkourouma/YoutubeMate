import { requireApiKey } from "../../server/secrets";
import { openRouterHeaders } from "../../server/http";

type RequestBody = {
  model?: string;
  language?: "fr" | "en";
  inputType?: "script" | "description";
  subject?: string;
  source?: string;
  direction?: string;
  previousTitles?: string[];
  thinking?: boolean;
  profile?: { channel?: string; theme?: string; audience?: string; tone?: string; thumbnailSystemPrompt?: string; descriptionFooter?: string };
};

function parseJsonContent(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? content).trim());
}

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  const guard = await requireApiKey("openrouter");
  if (guard instanceof Response) return guard;
  const { apiKey } = guard;
  const source = body.source?.trim() ?? "";
  const model = body.model?.trim();
  if (!model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
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
      "englishTitle": "natural English translation of the YouTube title",
      "englishDescription": "natural English translation of the A/B test description",
      "overlay": "2-5 WORD THUMBNAIL HEADLINE",
      "concepts": [{"name":"short concept name","prompt":"detailed English image prompt"}]
    }],
    "improvedDescription": "complete YouTube description",
    "tags": ["tag"],
    "pinnedComment": "short comment to pin below the video",
    "quiz": [{"question":"question","options":["answer A","answer B","answer C"],"correctOption":0}]
  }`;
  const instructions = `You are a senior YouTube packaging strategist. Return only valid JSON matching this schema: ${schema}
Rules: write viewer-facing copy in ${language}; create exactly 3 options with ids A, B, C; for every option also provide a fluent, natural English version in englishTitle and englishDescription so the app can reveal the vidIQ winner after scoring; each option must contain exactly 3 distinct thumbnail concepts; every image prompt must be in English, composed for a 16:9 YouTube thumbnail, high contrast, clear focal subject, no logo, no watermark, and no text because headline text is added separately; produce 8-15 relevant tags; create one concise pinnedComment in ${language}, 2-4 sentences, grounded in the source, ending with one specific question that encourages genuine replies; never invent facts, figures, links, offers or promises not found in the source. ${hasScript ? "Create exactly 5 quiz items. Every item must contain one question, exactly 3 plausible answer options, and correctOption as the zero-based index (0, 1, or 2) of the only correct option. The correct option must be strictly supported by the script. Distractors must be clearly false according to the source but not absurd." : "Return an empty quiz array."} The automatic description footer is managed by the application; do not paraphrase it.`;
  // A regeneration carries the user's direction and the titles they just rejected, so
  // the model changes course instead of returning near-identical options.
  const direction = typeof body.direction === "string" ? body.direction.trim().slice(0, 2_000) : "";
  const previousTitles = Array.isArray(body.previousTitles)
    ? body.previousTitles.filter((title): title is string => typeof title === "string" && title.trim().length > 0).slice(0, 6)
    : [];
  const steering = direction
    ? `\n\nUSER DIRECTION FOR THIS REGENERATION — follow it for all three options while keeping every rule above:\n${direction}${previousTitles.length ? `\n\nTHESE TITLES WERE JUST REJECTED. Do not repeat them, and do not offer close variants:\n${previousTitles.map(title => `- ${title}`).join("\n")}` : ""}`
    : "";
  const context = `CHANNEL: ${body.profile?.channel ?? ""}\nTHEME: ${body.profile?.theme ?? ""}\nAUDIENCE: ${body.profile?.audience ?? ""}\nTONE: ${body.profile?.tone ?? ""}\nTHUMBNAIL EDITORIAL SYSTEM: ${body.profile?.thumbnailSystemPrompt ?? "Not defined"}\nAUTOMATIC DESCRIPTION FOOTER (append exactly, unchanged):\n${body.profile?.descriptionFooter ?? "None"}\nSUBJECT: ${body.subject ?? ""}\nSOURCE TYPE: ${hasScript ? "script" : "description"}\nSOURCE:\n${source}${steering}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: instructions }, { role: "user", content: context }],
        // A steered regeneration is a reasoning task, so give the model room to think
        // and lower the temperature: the direction should be followed, not improvised on.
        ...(body.thinking ? { reasoning: { effort: "high", exclude: true } } : {}),
        temperature: direction ? 0.55 : 0.7,
        max_tokens: body.thinking ? 12_000 : 6_000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(body.thinking ? 180_000 : 90_000),
    });
    const upstream = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; usage?: unknown };
    if (!response.ok) return Response.json({ error: "openrouter_request_failed", detail: upstream.error?.message ?? "Request failed" }, { status: response.status === 401 ? 401 : 502 });
    const content = upstream.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "openrouter_empty_response" }, { status: 502 });
    const result = parseJsonContent(content) as {
      improvedDescription?: string;
      pinnedComment?: string;
      options?: Array<{ englishTitle?: string; englishDescription?: string }>;
      quiz?: Array<{ question?: string; options?: unknown[]; correctOption?: number }>;
      [key: string]: unknown;
    };
    const validEnglishPackaging = Array.isArray(result.options) && result.options.length === 3 && result.options.every(option =>
      typeof option.englishTitle === "string" && option.englishTitle.trim() &&
      typeof option.englishDescription === "string" && option.englishDescription.trim()
    );
    if (!validEnglishPackaging || typeof result.pinnedComment !== "string" || !result.pinnedComment.trim()) return Response.json({ error: "openrouter_invalid_packaging_extras" }, { status: 502 });
    if (hasScript) {
      const validQuiz = Array.isArray(result.quiz) && result.quiz.length === 5 && result.quiz.every(item =>
        typeof item.question === "string" && item.question.trim() &&
        Array.isArray(item.options) && item.options.length === 3 && item.options.every(option => typeof option === "string" && option.trim()) &&
        Number.isInteger(item.correctOption) && (item.correctOption ?? -1) >= 0 && (item.correctOption ?? -1) <= 2
      );
      if (!validQuiz) return Response.json({ error: "openrouter_invalid_quiz" }, { status: 502 });
    } else result.quiz = [];
    const footer = body.profile?.descriptionFooter?.trim();
    const generatedDescription = typeof result.improvedDescription === "string" ? result.improvedDescription.trim() : "";
    result.improvedDescription = footer && !generatedDescription.includes(footer) ? `${generatedDescription}\n\n${footer}`.trim() : generatedDescription;
    return Response.json({ result, usage: upstream.usage ?? null });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (timedOut) return Response.json({ error: "openrouter_timeout", detail: language === "English" ? "Packaging generation exceeded the allowed time. Regenerate to retry." : "La génération du packaging a dépassé le délai autorisé. Relancez la génération." }, { status: 504 });
    return Response.json({ error: "openrouter_invalid_response", detail: error instanceof Error ? error.message : "Invalid response" }, { status: 502 });
  }
}
