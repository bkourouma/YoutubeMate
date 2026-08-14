type ChapterDraft = {
  title?: unknown;
  objective?: unknown;
  keyPoints?: unknown;
  targetWords?: unknown;
};

type RequestBody = {
  apiKey?: string;
  model?: string;
  language?: "fr" | "en";
  subject?: string;
  duration?: string;
  targetBodyWords?: number;
  chapterCount?: number;
  hook?: string;
  promise?: string;
  profile?: { channel?: string; theme?: string; audience?: string; tone?: string };
};

type OpenRouterPayload = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string; error?: { message?: string; metadata?: { error_type?: string } } }>;
  error?: { message?: string; metadata?: { error_type?: string } };
  usage?: unknown;
};

function normalizeApiKey(value?: string) {
  return value?.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "") ?? "";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function parseJsonContent(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced ?? content).trim();
  try { return JSON.parse(source) as { chapters?: ChapterDraft[] }; } catch {
    const firstBrace = source.indexOf("{");
    const lastBrace = source.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) return JSON.parse(source.slice(firstBrace, lastBrace + 1)) as { chapters?: ChapterDraft[] };
    throw new Error("invalid_json");
  }
}

function usableChapters(value: unknown): value is ChapterDraft[] {
  return Array.isArray(value) && value.length >= 5 && value.length <= 12 && value.every(chapter => (
    typeof chapter?.title === "string" && chapter.title.trim().length >= 3 && chapter.title.length <= 160
    && typeof chapter.objective === "string" && chapter.objective.trim().length >= 10 && chapter.objective.length <= 800
    && Array.isArray(chapter.keyPoints) && chapter.keyPoints.length >= 2 && chapter.keyPoints.length <= 5
    && chapter.keyPoints.every((point: unknown) => typeof point === "string" && point.trim().length >= 2 && point.length <= 300)
    && typeof chapter.targetWords === "number" && Number.isFinite(chapter.targetWords) && chapter.targetWords > 0
  ));
}

function normalizeTargets(chapters: ChapterDraft[], targetBodyWords: number) {
  const weights = chapters.map(chapter => typeof chapter.targetWords === "number" && chapter.targetWords > 0 ? chapter.targetWords : 1);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || chapters.length;
  const base = 50;
  const distributable = Math.max(0, targetBodyWords - base * chapters.length);
  const targets = weights.map(weight => base + Math.floor(distributable * weight / weightTotal));
  let difference = targetBodyWords - targets.reduce((sum, target) => sum + target, 0);
  for (let index = 0; difference > 0; index = (index + 1) % targets.length, difference -= 1) targets[index] += 1;
  return chapters.map((chapter, index) => ({
    id: `chapter-${index + 1}`,
    title: String(chapter.title).trim(),
    objective: String(chapter.objective).trim(),
    keyPoints: (chapter.keyPoints as string[]).map(point => point.trim()),
    targetWords: targets[index],
  }));
}

function normalizedStatus(status: number) {
  return [400, 401, 402, 403, 408, 422, 429, 503, 504].includes(status) ? status : 502;
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as RequestBody;
  const apiKey = normalizeApiKey(body.apiKey);
  const model = typeof body.model === "string" ? body.model.trim().slice(0, 200) : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const targetBodyWords = clamp(typeof body.targetBodyWords === "number" && Number.isFinite(body.targetBodyWords) ? body.targetBodyWords : 1_000, 650, 4_000);
  const requestedChapterCount = clamp(typeof body.chapterCount === "number" && Number.isFinite(body.chapterCount) ? body.chapterCount : 7, 5, 12);
  if (!apiKey || !model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
  if (subject.length < 3 || subject.length > 2_000) return Response.json({ error: "invalid_subject" }, { status: 400 });

  const language = body.language === "en" ? "English" : "French";
  const schema = `{"chapters":[{"title":"short spoken chapter title","objective":"what this chapter must teach or demonstrate","keyPoints":["point 1","point 2"],"targetWords":150}]}`;
  const chapterSchema = {
    type: "object",
    properties: {
      chapters: {
        type: "array",
        minItems: 5,
        maxItems: 12,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            objective: { type: "string" },
            keyPoints: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
            targetWords: { type: "integer" },
          },
          required: ["title", "objective", "keyPoints", "targetWords"],
          additionalProperties: false,
        },
      },
    },
    required: ["chapters"],
    additionalProperties: false,
  };
  const safe = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
  const system = `You are a senior YouTube documentary editor and learning designer. Think deeply before answering, but return only valid JSON matching ${schema}.
Write in ${language}. Build a coherent progression for a ${safe(body.duration, 80) || "8-12 minute"} video. Choose between 5 and 12 chapters according to both the target length and the subject's real complexity. ${requestedChapterCount} chapters is a duration-based recommendation, not an obligation. Together they must support a spoken body of about ${targetBodyWords} words. Every chapter needs a distinct purpose, 2 to 5 concrete key points, and a realistic targetWords allocation. Start with the viewer's problem, develop the explanation or demonstration progressively, include necessary nuance or limits, and end with practical application. Avoid repetition, generic filler, fake facts, unsupported claims, and invented sources. Do not repeat the protected channel introduction, hook, promise, launch line, conclusion, or CTA.`;
  const user = `CHANNEL: ${safe(body.profile?.channel, 200)}
THEME: ${safe(body.profile?.theme, 500)}
AUDIENCE: ${safe(body.profile?.audience, 1_500)}
TONE: ${safe(body.profile?.tone, 1_000)}
SUBJECT: ${subject}
HOOK: ${safe(body.hook, 2_000)}
PROMISE: ${safe(body.promise, 2_000)}
TARGET BODY: ${targetBodyWords} words; use 5 to 12 chapters, with ${requestedChapterCount} as a starting recommendation.`;

  try {
    const callModel = async (messages: Array<{ role: "system" | "user"; content: string }>) => {
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
          messages,
          max_tokens: 9_000,
          reasoning: { effort: "high", exclude: true },
          response_format: { type: "json_schema", json_schema: { name: "youtube_chapter_plan", strict: true, schema: chapterSchema } },
          plugins: [{ id: "response-healing" }],
          provider: { require_parameters: true, data_collection: "deny" },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      const upstream = await response.json() as OpenRouterPayload;
      return { response, upstream, content: upstream.choices?.[0]?.message?.content, choiceError: upstream.choices?.[0]?.error, finishReason: upstream.choices?.[0]?.finish_reason };
    };
    const parse = (content?: string) => {
      if (!content) return null;
      try { return parseJsonContent(content).chapters ?? null; } catch { return null; }
    };

    let completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }]);
    if (!completion.response.ok) return Response.json({ error: "openrouter_chapters_failed", detail: completion.upstream.error?.message ?? "OpenRouter request failed" }, { status: normalizedStatus(completion.response.status) });
    if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not complete the chapter plan.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
    let chapters = parse(completion.content);
    if (!usableChapters(chapters)) {
      const repair = `The previous answer was incomplete or invalid. Return only JSON. Create 5 to 12 complete chapters in ${language}, choosing the count from the topic complexity and target length; ${requestedChapterCount} is a recommendation. Each needs title, objective, 2 to 5 keyPoints, and targetWords. The total target is ${targetBodyWords} words.\n\nDRAFT:\n${completion.content ?? "empty"}`;
      completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }, { role: "user", content: repair }]);
      if (!completion.response.ok) return Response.json({ error: "openrouter_chapters_repair_failed", detail: completion.upstream.error?.message ?? "OpenRouter repair failed" }, { status: normalizedStatus(completion.response.status) });
      if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not repair the chapter plan.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
      chapters = parse(completion.content);
    }
    if (!usableChapters(chapters)) return Response.json({ error: "openrouter_invalid_chapters", detail: "Le modèle n’a pas fourni un plan de 5 à 12 chapitres exploitable." }, { status: 502 });
    return Response.json({
      result: { chapters: normalizeTargets(chapters, targetBodyWords), targetBodyWords },
      model,
      reasoningEffort: "high",
      usage: completion.upstream.usage ?? null,
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json({ error: timedOut ? "openrouter_timeout" : "openrouter_invalid_response", detail: timedOut ? "La génération du plan a dépassé le délai autorisé. Réessayez." : error instanceof Error ? error.message : "Invalid response" }, { status: timedOut ? 504 : 502 });
  }
}
