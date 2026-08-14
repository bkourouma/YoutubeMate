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
  action?: "section" | "conclusion";
  subject?: string;
  duration?: string;
  targetBodyWords?: number;
  hook?: string;
  promise?: string;
  body?: string;
  chapters?: Chapter[];
  sectionIndex?: number;
  previousSections?: Array<{ id?: unknown; script?: unknown; transition?: unknown }>;
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

type PreviousSection = { id: string; script: string; transition: string };

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

// The prefix already written client-side: exactly min(2, sectionIndex) sections, oldest
// first, each positionally matching the chapter it was written for.
function validPreviousSections(value: unknown, chapters: Chapter[], sectionIndex: number): value is PreviousSection[] {
  const expected = Math.min(2, sectionIndex);
  return Array.isArray(value) && value.length === expected && value.every((section, index) => (
    typeof section?.id === "string" && section.id === chapters[sectionIndex - expected + index].id
    && typeof section.script === "string" && section.script.trim().length >= 80 && section.script.length <= 30_000
    && typeof section.transition === "string" && section.transition.length <= 2_000
  ));
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
  const action = body.action === "conclusion" || body.action === "section" ? body.action : null;
  const targetBodyWords = clamp(typeof body.targetBodyWords === "number" && Number.isFinite(body.targetBodyWords) ? body.targetBodyWords : 1_100, 650, 4_000);
  const chapters = body.chapters ?? [];
  const sectionIndex = Number.isInteger(body.sectionIndex) ? body.sectionIndex as number : -1;
  if (!action) return Response.json({ error: "invalid_action" }, { status: 400 });
  if (!apiKey || !model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
  if (subject.length < 3 || subject.length > 2_000) return Response.json({ error: "invalid_subject" }, { status: 400 });
  if (action === "section" && (!validChapters(chapters) || new Set(chapters.map(chapter => chapter.id)).size !== chapters.length)) return Response.json({ error: "validated_chapters_required" }, { status: 400 });
  if (action === "section" && Math.abs(chapters.reduce((sum, chapter) => sum + chapter.targetWords, 0) - targetBodyWords) > Math.max(100, targetBodyWords * 0.2)) return Response.json({ error: "incoherent_chapter_targets" }, { status: 400 });
  if (action === "section" && (sectionIndex < 0 || sectionIndex >= chapters.length)) return Response.json({ error: "invalid_section_index" }, { status: 400 });
  if (action === "section" && !validPreviousSections(body.previousSections ?? [], chapters, sectionIndex)) return Response.json({ error: "invalid_previous_sections" }, { status: 400 });
  if (action === "conclusion" && (typeof body.body !== "string" || body.body.trim().length < 200 || body.body.length > 60_000)) return Response.json({ error: "script_body_required" }, { status: 400 });

  const language = body.language === "en" ? "English" : "French";
  const safe = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

  try {
    const callModel = async (messages: Array<{ role: "system" | "user"; content: string }>, schemaName: string, schema: Record<string, unknown>, maxTokens: number, timeoutMs: number) => {
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
        signal: AbortSignal.timeout(timeoutMs),
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
      let completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }], "youtube_conclusion", conclusionSchema, 5_000, 120_000);
      if (!completion.response.ok) return Response.json({ error: "openrouter_conclusion_failed", detail: completion.upstream.error?.message ?? "OpenRouter request failed" }, { status: normalizedStatus(completion.response.status) });
      if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not complete the conclusion.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
      let parsed: Record<string, unknown> | null = null;
      try { parsed = completion.content ? parseJsonContent(completion.content) : null; } catch { parsed = null; }
      let conclusion = typeof parsed?.conclusion === "string" ? parsed.conclusion.trim() : "";
      if (!conclusion || countWords(conclusion) < 90 || countWords(conclusion) > 160) {
        const repair = `Repair the draft into a complete ${language} conclusion of 100 to 140 words. Return only JSON with the conclusion field. Do not repeat the protected closing.\n\nDRAFT:\n${completion.content ?? "empty"}`;
        completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }, { role: "user", content: repair }], "youtube_conclusion", conclusionSchema, 5_000, 120_000);
        if (!completion.response.ok) return Response.json({ error: "openrouter_conclusion_repair_failed", detail: completion.upstream.error?.message ?? "OpenRouter repair failed" }, { status: normalizedStatus(completion.response.status) });
        if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not repair the conclusion.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
        try { parsed = completion.content ? parseJsonContent(completion.content) : null; } catch { parsed = null; }
        conclusion = typeof parsed?.conclusion === "string" ? parsed.conclusion.trim() : "";
      }
      if (!conclusion) return Response.json({ error: "openrouter_invalid_conclusion", detail: "Le modèle n’a pas produit de conclusion exploitable." }, { status: 502 });
      const conclusionWords = countWords(conclusion);
      return Response.json({ result: { conclusion, wordCount: conclusionWords }, warning: conclusionWords < 90 || conclusionWords > 160 ? { code: "conclusion_length_adjustment", wordCount: conclusionWords } : null, model, reasoningEffort: "high", usage: completion.upstream.usage ?? null });
    }

    const chapter = chapters[sectionIndex];
    const isLast = sectionIndex === chapters.length - 1;
    const previous = (body.previousSections ?? []) as PreviousSection[];
    const targetMinimum = Math.max(50, Math.round(chapter.targetWords * 0.7));
    // No id/title echo: a single section cannot misalign, and dropping them removes a failure mode.
    const sectionSchema = {
      type: "object",
      properties: { script: { type: "string" }, transition: { type: "string" } },
      required: ["script", "transition"],
      additionalProperties: false,
    };
    const chapterPlan = chapters.map((item, index) => `${index + 1}. [${item.id}] ${item.title}\nObjective: ${item.objective}\nKey points: ${item.keyPoints.join(" | ")}\nTarget: ${item.targetWords} words`).join("\n\n");
    const system = `You are an elite long-form YouTube scriptwriter. Think deeply before writing, then return only valid JSON matching the supplied schema. Write in ${language} for natural speech, not an essay. You are writing exactly one chapter of the video body: chapter ${sectionIndex + 1} of ${chapters.length}, titled "${chapter.title}". Write about ${chapter.targetWords} words in the script field. Fulfil this chapter's objective and cover every one of its key points. Do not re-explain material already covered by previous chapters, and do not develop later chapters. The complete body targets about ${targetBodyWords} words for a ${safe(body.duration, 80) || "8-12 minute"} video, after the protected introduction and conclusion are added. Use concrete explanations, examples or analogies only when grounded in the supplied subject; add smooth transitions, varied sentence rhythm, useful nuance, and practical takeaways. Avoid filler, repeated ideas, generic motivational language, fake facts, unsupported numbers, invented sources, and any claim not present in the context. Do not reproduce the hook, protected presentation, promise, launch line, conclusion, or CTA. Never write a chapter heading or number: the application inserts "CHAPITRE ${sectionIndex + 1}" automatically. The transition field must contain one or two short spoken sentences that ${isLast ? "close the body and hand off naturally to the video's conclusion — a recap and call to action follow, so do not write them" : `lead naturally into the next chapter, "${chapters[sectionIndex + 1].title}"`}.`;
    const previousText = previous.length ? previous.map((section, index) => {
      const number = sectionIndex - previous.length + index + 1;
      return `CHAPTER ${number} — ${chapters[number - 1].title}\n${section.script.trim()}${section.transition.trim() ? `\n${section.transition.trim()}` : ""}`;
    }).join("\n\n") : "None";
    const user = `CHANNEL: ${safe(body.profile?.channel, 200)}\nTHEME: ${safe(body.profile?.theme, 500)}\nAUDIENCE: ${safe(body.profile?.audience, 1_500)}\nTONE: ${safe(body.profile?.tone, 1_000)}\nSUBJECT: ${subject}\nHOOK: ${safe(body.hook, 2_000)}\nPROMISE: ${safe(body.promise, 2_000)}\nCOMPLETE VALIDATED CHAPTER PLAN (context only — write only your assigned chapter):\n${chapterPlan}\nALREADY WRITTEN: ${sectionIndex === 0 ? "none — this is the first chapter" : `chapters 1 to ${sectionIndex} are complete and followed the plan above`}.\nPREVIOUS CHAPTER TEXT (verbatim, for continuity — do not repeat it):\n${previousText}\nNOW WRITE CHAPTER ${sectionIndex + 1}: [${chapter.id}] ${chapter.title}\nObjective: ${chapter.objective}\nKey points: ${chapter.keyPoints.join(" | ")}\nTarget: ${chapter.targetWords} words`;
    const maxTokens = clamp(chapter.targetWords * 10, 4_000, 8_000);
    const parseSection = (content?: string) => {
      if (!content) return null;
      try {
        const parsed = parseJsonContent(content);
        return typeof parsed.script === "string" && parsed.script.trim() ? { script: parsed.script.trim(), transition: typeof parsed.transition === "string" ? parsed.transition.trim() : "" } : null;
      } catch { return null; }
    };
    let completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }], "youtube_script_section", sectionSchema, maxTokens, 100_000);
    if (!completion.response.ok) return Response.json({ error: "openrouter_section_failed", detail: completion.upstream.error?.message ?? "OpenRouter request failed" }, { status: normalizedStatus(completion.response.status) });
    if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not write this chapter.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
    let section = parseSection(completion.content);
    if (!section || section.script.length < 80 || countWords(section.script) < targetMinimum || completion.finishReason === "length") {
      const actualWords = section ? countWords(section.script) : 0;
      const repair = `Rewrite and complete this single chapter so it is fully developed. Return only JSON with the script and transition fields. The script must reach about ${chapter.targetWords} words (minimum ${targetMinimum}); the draft has about ${actualWords}. Preserve useful material, remove repetition, and expand what is missing from the chapter's key points.\n\nDRAFT:\n${completion.content ?? "empty"}`;
      completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }, { role: "user", content: repair }], "youtube_script_section", sectionSchema, maxTokens, 60_000);
      if (!completion.response.ok) return Response.json({ error: "openrouter_section_repair_failed", detail: completion.upstream.error?.message ?? "OpenRouter repair failed" }, { status: normalizedStatus(completion.response.status) });
      if (completion.choiceError || completion.finishReason === "error") return Response.json({ error: "openrouter_provider_error", detail: completion.choiceError?.message ?? "The selected provider could not repair this chapter.", providerErrorType: completion.choiceError?.metadata?.error_type ?? null }, { status: 502 });
      const repaired = parseSection(completion.content);
      // Keep the original draft when the repair comes back unusable: an under-target
      // section with a warning beats losing the chapter entirely.
      if (repaired && repaired.script.length >= 80) section = repaired;
    }
    if (!section || section.script.length < 80) return Response.json({ error: "openrouter_invalid_section", detail: language === "English" ? "The model did not write this chapter." : "Le modèle n’a pas rédigé ce chapitre." }, { status: 502 });
    const sectionWords = countWords(section.script);
    const warning = sectionWords < targetMinimum ? { code: "section_under_target", actualWords: sectionWords, targetMinimum } : null;
    return Response.json({ result: { section: { id: chapter.id, script: section.script, transition: section.transition }, wordCount: sectionWords, index: sectionIndex, targetWords: chapter.targetWords }, warning, model, reasoningEffort: "high", usage: completion.upstream.usage ?? null });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    const timeoutDetail = language === "English"
      ? (action === "section" ? "Chapter writing exceeded the allowed time. Retry — completed chapters are kept." : "Conclusion generation exceeded the allowed time. Retry.")
      : (action === "section" ? "La rédaction du chapitre a dépassé le délai autorisé. Réessayez : les chapitres déjà rédigés sont conservés." : "La génération de la conclusion a dépassé le délai autorisé. Réessayez.");
    return Response.json({ error: timedOut ? "openrouter_timeout" : "openrouter_invalid_response", detail: timedOut ? timeoutDetail : error instanceof Error ? error.message : "Invalid response" }, { status: timedOut ? 504 : 502 });
  }
}
