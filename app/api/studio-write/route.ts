type Chapter = {
  id: string;
  title: string;
  objective: string;
  keyPoints: string[];
  targetWords: number;
};

type RequestBody = {
  apiKey?: string;
  model?: string;
  language?: "fr" | "en";
  action?: "body" | "conclusion";
  subject?: string;
  duration?: string;
  targetBodyWords?: number;
  hook?: string;
  promise?: string;
  body?: string;
  chapters?: Chapter[];
  profile?: { channel?: string; theme?: string; audience?: string; tone?: string; closing?: string };
};

type OpenRouterPayload = {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
    error?: { message?: string; metadata?: { error_type?: string } };
  }>;
  error?: { message?: string; metadata?: { error_type?: string } };
  usage?: unknown;
};

type BodySection = { id?: unknown; title?: unknown; script?: unknown; transition?: unknown };

function normalizeApiKey(value?: string) {
  return value?.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "") ?? "";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
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

function validChapters(value: unknown): value is Chapter[] {
  return Array.isArray(value) && value.length >= 5 && value.length <= 12 && value.every(chapter => (
    typeof chapter?.id === "string" && chapter.id.trim().length > 0 && chapter.id.length <= 120
    && typeof chapter.title === "string" && chapter.title.trim().length > 0 && chapter.title.length <= 160
    && typeof chapter.objective === "string" && chapter.objective.trim().length > 0 && chapter.objective.length <= 800
    && Array.isArray(chapter.keyPoints) && chapter.keyPoints.length >= 2 && chapter.keyPoints.length <= 5
    && chapter.keyPoints.every((point: unknown) => typeof point === "string" && point.trim().length > 0 && point.length <= 300)
    && Number.isFinite(chapter.targetWords) && chapter.targetWords >= 50 && chapter.targetWords <= 1_500
  ));
}

function usableSections(value: unknown, chapters: Chapter[]): value is BodySection[] {
  return Array.isArray(value) && value.length === chapters.length && value.every((section, index) => (
    typeof section?.script === "string" && section.script.trim().length >= 80
    && typeof section.id === "string" && section.id === chapters[index].id
    && typeof section.title === "string"
    && typeof section.transition === "string"
  ));
}

function sectionDeficits(sections: BodySection[], chapters: Chapter[]) {
  return sections.flatMap((section, index) => {
    const actualWords = countWords(String(section.script));
    const targetMinimum = Math.max(50, Math.round(chapters[index].targetWords * 0.7));
    return actualWords < targetMinimum ? [{ id: chapters[index].id, title: chapters[index].title, actualWords, targetMinimum }] : [];
  });
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
  const action = body.action === "conclusion" ? "conclusion" : "body";
  const targetBodyWords = clamp(typeof body.targetBodyWords === "number" && Number.isFinite(body.targetBodyWords) ? body.targetBodyWords : 1_100, 650, 4_000);
  if (!apiKey || !model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
  if (subject.length < 3 || subject.length > 2_000) return Response.json({ error: "invalid_subject" }, { status: 400 });
  if (action === "body" && !validChapters(body.chapters)) return Response.json({ error: "validated_chapters_required" }, { status: 400 });
  if (action === "body" && Math.abs((body.chapters ?? []).reduce((sum, chapter) => sum + chapter.targetWords, 0) - targetBodyWords) > Math.max(100, targetBodyWords * 0.2)) return Response.json({ error: "incoherent_chapter_targets" }, { status: 400 });
  if (action === "conclusion" && (typeof body.body !== "string" || body.body.trim().length < 200 || body.body.length > 60_000)) return Response.json({ error: "script_body_required" }, { status: 400 });

  const language = body.language === "en" ? "English" : "French";
  const chapters = body.chapters ?? [];
  const safe = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

  try {
    const callModel = async (messages: Array<{ role: "system" | "user"; content: string }>, schemaName: string, schema: Record<string, unknown>, maxTokens: number) => {
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
          max_tokens: maxTokens,
          reasoning: { effort: "high", exclude: true },
          response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
          plugins: [{ id: "response-healing" }],
          provider: { require_parameters: true, data_collection: "deny" },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      const upstream = await response.json() as OpenRouterPayload;
      return { response, upstream, content: upstream.choices?.[0]?.message?.content, finishReason: upstream.choices?.[0]?.finish_reason, choiceError: upstream.choices?.[0]?.error };
    };

    if (action === "conclusion") {
      const conclusionSchema = {
        type: "object",
        properties: { conclusion: { type: "string" } },
        required: ["conclusion"],
        additionalProperties: false,
      };
      const system = `You are a senior YouTube script editor. Think deeply, then return only valid JSON. Write a natural spoken conclusion in ${language}, 90 to 160 words. Summarize only what the supplied body actually covered, fulfil the viewer promise honestly, end with one concrete engagement question, and transition naturally to the protected closing line. Do not reproduce that protected closing line. Do not invent facts, figures, sources, results, or guarantees.`;
      const user = `CHANNEL: ${safe(body.profile?.channel, 200)}\nAUDIENCE: ${safe(body.profile?.audience, 1_500)}\nTONE: ${safe(body.profile?.tone, 1_000)}\nSUBJECT: ${subject}\nHOOK: ${safe(body.hook, 2_000)}\nPROMISE: ${safe(body.promise, 2_000)}\nPROTECTED CLOSING (do not repeat): ${safe(body.profile?.closing, 1_500)}\nBODY:\n${safe(body.body, 60_000)}`;
      let completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }], "youtube_conclusion", conclusionSchema, 5_000);
      if (!completion.response.ok) return Response.json({ error: "openrouter_conclusion_failed", detail: completion.upstream.error?.message ?? "OpenRouter request failed" }, { status: normalizedStatus(completion.response.status) });
      if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not complete the conclusion.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
      let parsed: Record<string, unknown> | null = null;
      try { parsed = completion.content ? parseJsonContent(completion.content) : null; } catch { parsed = null; }
      let conclusion = typeof parsed?.conclusion === "string" ? parsed.conclusion.trim() : "";
      if (!conclusion || countWords(conclusion) < 90 || countWords(conclusion) > 160) {
        const repair = `Repair the draft into a complete ${language} conclusion of 100 to 140 words. Return only JSON with the conclusion field. Do not repeat the protected closing.\n\nDRAFT:\n${completion.content ?? "empty"}`;
        completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }, { role: "user", content: repair }], "youtube_conclusion", conclusionSchema, 5_000);
        if (!completion.response.ok) return Response.json({ error: "openrouter_conclusion_repair_failed", detail: completion.upstream.error?.message ?? "OpenRouter repair failed" }, { status: normalizedStatus(completion.response.status) });
        if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not repair the conclusion.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
        try { parsed = completion.content ? parseJsonContent(completion.content) : null; } catch { parsed = null; }
        conclusion = typeof parsed?.conclusion === "string" ? parsed.conclusion.trim() : "";
      }
      if (!conclusion) return Response.json({ error: "openrouter_invalid_conclusion", detail: "Le modèle n’a pas produit de conclusion exploitable." }, { status: 502 });
      const conclusionWords = countWords(conclusion);
      return Response.json({ result: { conclusion, wordCount: conclusionWords }, warning: conclusionWords < 90 || conclusionWords > 160 ? { code: "conclusion_length_adjustment", wordCount: conclusionWords } : null, model, reasoningEffort: "high", usage: completion.upstream.usage ?? null });
    }

    const sectionSchema = {
      type: "object",
      properties: {
        sections: {
          type: "array",
          minItems: chapters.length,
          maxItems: chapters.length,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              script: { type: "string" },
              transition: { type: "string" },
            },
            required: ["id", "title", "script", "transition"],
            additionalProperties: false,
          },
        },
      },
      required: ["sections"],
      additionalProperties: false,
    };
    const chapterPlan = chapters.map((chapter, index) => `${index + 1}. [${chapter.id}] ${chapter.title}\nObjective: ${chapter.objective}\nKey points: ${chapter.keyPoints.join(" | ")}\nTarget: ${chapter.targetWords} words`).join("\n\n");
    const system = `You are an elite long-form YouTube scriptwriter. Think deeply before writing, then return only valid JSON matching the supplied schema. Write in ${language} for natural speech, not an essay. Develop every validated chapter exactly once and in order. The complete body must contain about ${targetBodyWords} words and be suitable for a ${safe(body.duration, 80) || "8-12 minute"} video after the protected introduction and conclusion are added. Respect each chapter's target. Use concrete explanations, examples or analogies only when grounded in the supplied subject; add smooth transitions, varied sentence rhythm, useful nuance, and practical takeaways. Avoid filler, repeated ideas, generic motivational language, fake facts, unsupported numbers, invented sources, and any claim not present in the context. Do not reproduce the hook, protected presentation, promise, launch line, conclusion, or CTA.`;
    const user = `CHANNEL: ${safe(body.profile?.channel, 200)}\nTHEME: ${safe(body.profile?.theme, 500)}\nAUDIENCE: ${safe(body.profile?.audience, 1_500)}\nTONE: ${safe(body.profile?.tone, 1_000)}\nSUBJECT: ${subject}\nHOOK: ${safe(body.hook, 2_000)}\nPROMISE: ${safe(body.promise, 2_000)}\nVALIDATED CHAPTER PLAN:\n${chapterPlan}`;
    const maxTokens = clamp(targetBodyWords * 10, 16_000, 48_000);
    let completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }], "youtube_script_body", sectionSchema, maxTokens);
    if (!completion.response.ok) return Response.json({ error: "openrouter_body_failed", detail: completion.upstream.error?.message ?? "OpenRouter request failed" }, { status: normalizedStatus(completion.response.status) });
    if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not complete the script body.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
    const parseSections = (content?: string) => {
      if (!content) return null;
      try { return parseJsonContent(content).sections ?? null; } catch { return null; }
    };
    let sections = parseSections(completion.content);
    const bodyFromSections = (items: BodySection[]) => items.map((section, index) => {
      const script = String(section.script).trim();
      const transition = typeof section.transition === "string" ? section.transition.trim() : "";
      return `CHAPITRE ${index + 1} — ${chapters[index].title.toUpperCase()}\n\n${script}${transition ? `\n\n${transition}` : ""}`;
    }).join("\n\n");
    let generatedBody = usableSections(sections, chapters) ? bodyFromSections(sections) : "";
    let generatedWords = countWords(generatedBody);
    const targetMinimum = Math.round(targetBodyWords * 0.9);
    let weakChapters = usableSections(sections, chapters) ? sectionDeficits(sections, chapters) : [];
    if (!generatedBody || generatedWords < targetMinimum || weakChapters.length || completion.finishReason === "length") {
      const deficit = Math.max(0, targetBodyWords - generatedWords);
      const weakList = weakChapters.length ? weakChapters.map(chapter => `${chapter.title}: ${chapter.actualWords}/${chapter.targetMinimum} words minimum`).join("; ") : "structural validation failed or no individual deficit measured";
      const repair = `Rewrite and complete the draft so every validated chapter is fully developed. Return only JSON. The final body must reach ${targetBodyWords} words (minimum ${targetMinimum}); it is currently about ${generatedWords}, a deficit of ${deficit}. Underdeveloped chapters: ${weakList}. Preserve useful material, remove repetition, and expand the chapters that are below their target.\n\nDRAFT:\n${completion.content ?? "empty"}`;
      completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }, { role: "user", content: repair }], "youtube_script_body", sectionSchema, maxTokens);
      if (!completion.response.ok) return Response.json({ error: "openrouter_body_repair_failed", detail: completion.upstream.error?.message ?? "OpenRouter repair failed" }, { status: normalizedStatus(completion.response.status) });
      if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not repair the script body.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
      sections = parseSections(completion.content);
      generatedBody = usableSections(sections, chapters) ? bodyFromSections(sections) : "";
      generatedWords = countWords(generatedBody);
      weakChapters = usableSections(sections, chapters) ? sectionDeficits(sections, chapters) : [];
    }
    if (!generatedBody) return Response.json({ error: "openrouter_invalid_body", detail: "Le modèle n’a pas développé tous les chapitres validés." }, { status: 502 });
    const warning = generatedWords < targetMinimum || weakChapters.length ? { code: "body_under_target", actualWords: generatedWords, targetWords: targetBodyWords, targetMinimum, deficit: Math.max(0, targetMinimum - generatedWords), chapterDeficits: weakChapters } : null;
    return Response.json({ result: { body: generatedBody, sections, wordCount: generatedWords, targetBodyWords }, warning, model, reasoningEffort: "high", usage: completion.upstream.usage ?? null });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json({ error: timedOut ? "openrouter_timeout" : "openrouter_invalid_response", detail: timedOut ? "La génération longue a dépassé le délai autorisé. Réessayez." : error instanceof Error ? error.message : "Invalid response" }, { status: timedOut ? 504 : 502 });
  }
}
