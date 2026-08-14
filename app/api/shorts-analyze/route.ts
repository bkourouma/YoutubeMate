import { requireApiKey } from "../../server/secrets";
import { fetchUpstream, isTimeout, openRouterHeaders } from "../../server/http";
import { cachedUsage, makeCacheKey, readAiCache, writeAiCache } from "../../server/ai-cache";

const DEFAULT_MODEL = "openai/gpt-5.4-mini";
const BATCH_SIZE = 10;
const MAX_VIDEOS = 50;
const MAX_TRANSCRIPT = 400_000;

type TimeSegment = { startTime: string; endTime: string };

type GeneratedShort = {
  title: string;
  text: string;
  reason?: string;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
  sequences?: TimeSegment[];
  positionEstimated?: boolean;
};

type CueRange = { startCue?: unknown; endCue?: unknown };
type TimedGeneratedShort = { title?: unknown; durationMinutes?: unknown; sequences?: CueRange[] };
type SrtCue = { id: number; startSeconds: number; endSeconds: number; text: string };

type AiUsage = {
  model: string; cost: number; promptTokens: number; completionTokens: number;
  reasoningTokens: number; cachedTokens: number; cacheHit: false;
};

type OpenRouterData = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    cost?: number | string; prompt_tokens?: number; completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

type OpenRouterErrorData = { error?: { code?: number | string; message?: string } };

/** Carries a stable code alongside the readable detail, so the UI can translate. */
class UpstreamError extends Error {
  constructor(readonly code: string, message: string, readonly status = 502) {
    super(message);
    this.name = "UpstreamError";
  }
}

const normalizeText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function formatSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function normalizeTime(value: unknown) {
  const parts = String(value ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (parts.length >= 4) return formatSeconds(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 3) return formatSeconds(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return formatSeconds(parts[0] * 60 + parts[1]);
  return "";
}

function secondsFromTimestamp(hours: string, minutes: string, seconds: string, milliseconds: string) {
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 1000;
}

// Kept verbatim from Shorts Studio: this cue parsing is what makes exact source
// timecodes possible, and it is the most valuable logic in the pipeline.
function parseSrt(transcript: string) {
  const lines = transcript.replace(/\r/g, "").split("\n");
  const timestampPattern = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/;
  const rawCues: Array<Omit<SrtCue, "id">> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].trim().match(timestampPattern);
    if (!match) continue;

    const textLines: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const current = lines[cursor].trim();
      if (!current || timestampPattern.test(current)) break;
      if (/^\d+$/.test(current) && cursor + 1 < lines.length && timestampPattern.test(lines[cursor + 1].trim())) break;
      textLines.push(current);
      cursor += 1;
    }

    const text = textLines.join(" ").replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text) {
      rawCues.push({
        startSeconds: secondsFromTimestamp(match[1], match[2], match[3], match[4]),
        endSeconds: secondsFromTimestamp(match[5], match[6], match[7], match[8]),
        text,
      });
    }
    index = Math.max(index, cursor - 1);
  }

  const speakerPattern = /^([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9 ._'’()/-]{0,79}):\s+(.+)$/;
  const speakerCounts = new Map<string, number>();
  rawCues.forEach(cue => {
    const match = cue.text.match(speakerPattern);
    if (!match) return;
    const key = normalizeText(match[1]);
    speakerCounts.set(key, (speakerCounts.get(key) ?? 0) + 1);
  });

  return rawCues.map((cue, index) => {
    const speakerMatch = cue.text.match(speakerPattern);
    const recurringSpeaker = speakerMatch && (speakerCounts.get(normalizeText(speakerMatch[1])) ?? 0) >= 2;
    return { ...cue, id: index + 1, text: recurringSpeaker && speakerMatch ? speakerMatch[2].trim() : cue.text };
  });
}

function estimatePosition(transcript: string, excerpt: string) {
  const spokenTranscript = transcript.replace(/^\s*\d+\s*$/gm, "").replace(/^.*-->.*$/gm, "");
  const source = normalizeText(spokenTranscript);
  const excerptWords = normalizeText(excerpt).split(/\s+/).filter(Boolean);
  const key = excerptWords.slice(0, Math.min(10, excerptWords.length)).join(" ");
  const characterIndex = key ? source.indexOf(key) : -1;
  const wordsBefore = characterIndex >= 0 ? source.slice(0, characterIndex).split(/\s+/).filter(Boolean).length : 0;
  return {
    startTime: formatSeconds(wordsBefore / 150 * 60),
    endTime: formatSeconds((wordsBefore + excerptWords.length) / 150 * 60),
    positionEstimated: true,
  };
}

function readUsage(data: OpenRouterData, model: string): AiUsage {
  const usage = data.usage;
  return {
    model,
    cost: Number(usage?.cost ?? 0) || 0,
    promptTokens: Number(usage?.prompt_tokens ?? 0) || 0,
    completionTokens: Number(usage?.completion_tokens ?? 0) || 0,
    reasoningTokens: Number(usage?.completion_tokens_details?.reasoning_tokens ?? 0) || 0,
    cachedTokens: Number(usage?.prompt_tokens_details?.cached_tokens ?? 0) || 0,
    cacheHit: false,
  };
}

function addUsage(items: AiUsage[], model: string): AiUsage {
  return items.reduce<AiUsage>((total, item) => ({
    model,
    cost: total.cost + item.cost,
    promptTokens: total.promptTokens + item.promptTokens,
    completionTokens: total.completionTokens + item.completionTokens,
    reasoningTokens: total.reasoningTokens + item.reasoningTokens,
    cachedTokens: total.cachedTokens + item.cachedTokens,
    cacheHit: false,
  }), { model, cost: 0, promptTokens: 0, completionTokens: 0, reasoningTokens: 0, cachedTokens: 0, cacheHit: false });
}

async function callOpenRouter(apiKey: string, model: string, prompt: string, maxTokens: number) {
  const response = await fetchUpstream("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      reasoning: { effort: "none", exclude: true },
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
    timeoutMs: 120_000,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as OpenRouterErrorData | null;
    // Status, code and request id only — never the full upstream body, which can echo input.
    console.error("OpenRouter analysis request failed", {
      status: response.status,
      code: payload?.error?.code ?? null,
      requestId: response.headers.get("x-request-id"),
    });
    if (response.status === 401 || response.status === 403) throw new UpstreamError("openrouter_unauthorized", "La clé OpenRouter n’est plus valide. Vérifiez-la dans Paramètres.", 401);
    if (response.status === 402) throw new UpstreamError("openrouter_insufficient_credits", "Le solde OpenRouter est insuffisant. Rechargez le compte puis réessayez.", 402);
    if (response.status === 429) throw new UpstreamError("openrouter_rate_limited", "La limite OpenRouter est atteinte. Attendez un instant puis réessayez.", 429);
    if (response.status === 400) throw new UpstreamError("openrouter_request_rejected", "OpenRouter a refusé la demande d’analyse. Vérifiez le modèle et ses paramètres.");
    throw new UpstreamError("openrouter_unavailable", "OpenRouter est temporairement indisponible. Réessayez dans un instant.", 503);
  }
  const data = await response.json() as OpenRouterData;
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return { parsed: JSON.parse(content) as { shorts?: unknown[] }, usage: readUsage(data, model) };
}

function timedDurationInstruction(fixedDuration: number | null) {
  return fixedDuration
    ? `Chaque extrait vise ${fixedDuration} minute${fixedDuration > 1 ? "s" : ""} (environ ${fixedDuration * 140} à ${fixedDuration * 170} mots de parole) et durationMinutes vaut ${fixedDuration}. La durée cumulée de toutes ses séquences doit rester entre ${fixedDuration * 45} et ${fixedDuration * 60 + 5} secondes.`
    : "Choisis durationMinutes à 1, 2 ou 3 selon la richesse du thème : 1 pour une idée simple, 2 pour une explication structurée, 3 quand le contexte est indispensable. La durée cumulée de toutes les séquences doit rester entre durationMinutes × 45 secondes et durationMinutes × 60 secondes + 5 secondes.";
}

function constrainCueRanges(cues: SrtCue[], ranges: Array<{ startCue: number; endCue: number }>, targetMinutes: number) {
  const maxSeconds = targetMinutes * 60 + 5;
  const maxWords = targetMinutes * 180;
  const selected: Array<{ startCue: number; endCue: number }> = [];
  let totalSeconds = 0;
  let totalWords = 0;
  let lastCue = 0;

  for (const range of ranges) {
    const startCue = Math.max(range.startCue, lastCue + 1);
    if (startCue > range.endCue) continue;
    let selectedEnd = startCue - 1;
    let rangeWords = 0;
    const rangeStartSeconds = cues[startCue - 1].startSeconds;

    for (let cueId = startCue; cueId <= range.endCue; cueId += 1) {
      const cue = cues[cueId - 1];
      const nextWords = rangeWords + cue.text.split(/\s+/).filter(Boolean).length;
      const nextSeconds = cue.endSeconds - rangeStartSeconds;
      if (totalWords + nextWords > maxWords || totalSeconds + nextSeconds > maxSeconds) break;
      selectedEnd = cueId;
      rangeWords = nextWords;
    }

    if (selectedEnd >= startCue) {
      selected.push({ startCue, endCue: selectedEnd });
      totalWords += rangeWords;
      totalSeconds += cues[selectedEnd - 1].endSeconds - rangeStartSeconds;
      lastCue = selectedEnd;
    }
    if (selectedEnd < range.endCue || totalSeconds >= maxSeconds - 2 || totalWords >= maxWords - 5) break;
  }
  return selected.length ? selected : [{ startCue: ranges[0].startCue, endCue: ranges[0].startCue }];
}

async function generateTimedShorts(apiKey: string, model: string, cues: SrtCue[], requestedVideos: number, fixedDuration: number | null) {
  const compactTranscript = cues.map(cue => `#${cue.id} [${formatSeconds(cue.startSeconds)}-${formatSeconds(cue.endSeconds)}] ${cue.text}`).join("\n");
  const prompt = `Tu es un monteur expert de YouTube Shorts. Sélectionne dans la transcription ci-dessous exactement ${requestedVideos} idées fortes, autonomes, distinctes et classées par intérêt. ${timedDurationInstruction(fixedDuration)}

Tu ne dois retourner aucun texte de transcription : indique uniquement les numéros des sous-titres source. Une séquence est une plage continue et inclusive de sous-titres, avec startCue et endCue. Tu peux assembler plusieurs passages non consécutifs si cela améliore la clarté ; donne alors plusieurs séquences dans l’ordre du montage. N’utilise chaque parole qu’à l’intérieur de la plage indiquée. Conserve les phrases exactes, un hook pertinent, une progression claire et une fin naturelle. Exclue autopromotion, biographie, salutations, abonnement, like, partage, conclusion générique et passages sans valeur informative. Un CTA séparé sera ajouté ensuite.

Réponds uniquement en JSON strict : {"shorts":[{"title":"titre bref","durationMinutes":1,"sequences":[{"startCue":12,"endCue":31},{"startCue":48,"endCue":55}]}]}. Le tableau shorts contient exactement ${requestedVideos} éléments. durationMinutes vaut toujours 1, 2 ou 3. Chaque extrait contient au moins une séquence valide, avec 1 <= startCue <= endCue <= ${cues.length}.

TRANSCRIPTION COMPACTE :
${compactTranscript}`;
  const maxTokens = Math.min(12000, Math.max(1800, 700 + requestedVideos * 170));
  const { parsed, usage } = await callOpenRouter(apiKey, model, prompt, maxTokens);
  if (!Array.isArray(parsed.shorts)) throw new UpstreamError("analysis_invalid_shape", "L’analyse IA a renvoyé un format inattendu.");

  const shorts = parsed.shorts.slice(0, requestedVideos).map((candidate, shortIndex) => {
    const short = candidate as TimedGeneratedShort;
    const ranges = (Array.isArray(short.sequences) ? short.sequences : []).map(sequence => {
      const startCue = Math.round(Number(sequence.startCue));
      const endCue = Math.round(Number(sequence.endCue));
      if (!Number.isFinite(startCue) || !Number.isFinite(endCue) || startCue < 1 || endCue < startCue || endCue > cues.length) return null;
      return { startCue, endCue };
    }).filter((range): range is { startCue: number; endCue: number } => range !== null);
    if (!ranges.length) throw new UpstreamError("analysis_missing_sequences", `L’extrait ${shortIndex + 1} ne contient aucune séquence source valide.`);

    const modelDuration = Math.round(Number(short.durationMinutes));
    const durationMinutes = fixedDuration ?? (Number.isFinite(modelDuration) ? Math.min(3, Math.max(1, modelDuration)) : 1);
    const constrainedRanges = constrainCueRanges(cues, ranges, durationMinutes);
    const sequences = constrainedRanges.map(({ startCue, endCue }) => ({
      startTime: formatSeconds(cues[startCue - 1].startSeconds),
      endTime: formatSeconds(cues[endCue - 1].endSeconds),
    }));
    const text = constrainedRanges.flatMap(({ startCue, endCue }) => cues.slice(startCue - 1, endCue).map(cue => cue.text)).join(" ").replace(/\s+/g, " ").trim();
    return {
      title: String(short.title ?? "").trim() || `Extrait ${shortIndex + 1}`,
      text,
      durationMinutes,
      sequences,
      startTime: sequences[0].startTime,
      endTime: sequences[sequences.length - 1].endTime,
      positionEstimated: false,
    } satisfies GeneratedShort;
  });

  if (shorts.length !== requestedVideos) throw new UpstreamError("analysis_wrong_count", "L’analyse IA n’a pas généré le nombre d’extraits demandé.");
  return { shorts, usage };
}

async function generatePlainBatch(options: {
  apiKey: string; model: string; transcript: string; durationInstruction: string;
  requestedVideos: number; start: number; count: number; fixedDuration: number | null;
}) {
  const { apiKey, model, transcript, durationInstruction, requestedVideos, start, count, fixedDuration } = options;
  const end = start + count - 1;
  const prompt = `Tu es un éditeur expert de YouTube Shorts. Analyse cette transcription. Établis mentalement un classement global de ${requestedVideos} idées fortes et distinctes. Ne retourne que les idées classées de ${start} à ${end}, soit exactement ${count} extrait${count > 1 ? "s" : ""}. Pour chaque idée, compose un extrait autonome et captivant uniquement à partir de phrases exactes de la transcription. Tu peux assembler plusieurs passages non consécutifs quand cela améliore la clarté, mais conserve leur ordre. ${durationInstruction} La transcription n’est pas horodatée : estime startTime et endTime de chaque passage d’après la position des mots à 150 mots par minute, au format MM:SS. Le champ text contient uniquement les paroles assemblées, sans reformulation ni invention. Garde un hook pertinent. Exclue autopromotion, biographie, salutations, abonnement, like, partage, conclusion générique et phrase sans valeur informative. Une vidéo CTA séparée pourra être ajoutée ensuite.

Réponds uniquement en JSON strict : {"shorts":[{"title":"titre bref","text":"extrait exact","reason":"idée couverte","durationMinutes":1,"sequences":[{"startTime":"02:15","endTime":"02:42"}]}]}. Le tableau shorts contient exactement ${count} éléments. durationMinutes vaut toujours 1, 2 ou 3 et chaque élément a au moins une séquence.

TRANSCRIPTION :
${transcript}`;
  const estimatedTokensPerShort = fixedDuration ? fixedDuration * 260 : 650;
  const maxTokens = Math.min(12000, Math.max(2400, 900 + count * estimatedTokensPerShort));
  const { parsed, usage } = await callOpenRouter(apiKey, model, prompt, maxTokens);
  if (!Array.isArray(parsed.shorts)) throw new UpstreamError("analysis_invalid_shape", "L’analyse IA a renvoyé un format inattendu.");

  const shorts = (parsed.shorts as GeneratedShort[]).slice(0, count).map(short => {
    const sequences = (Array.isArray(short.sequences) ? short.sequences : [])
      .map(sequence => ({ startTime: normalizeTime(sequence.startTime), endTime: normalizeTime(sequence.endTime) }))
      .filter(sequence => sequence.startTime && sequence.endTime);
    const legacyStart = normalizeTime(short.startTime);
    const legacyEnd = normalizeTime(short.endTime);
    if (!sequences.length && legacyStart && legacyEnd) sequences.push({ startTime: legacyStart, endTime: legacyEnd });
    if (!sequences.length) {
      const estimated = estimatePosition(transcript, short.text);
      sequences.push({ startTime: estimated.startTime, endTime: estimated.endTime });
    }
    return { ...short, sequences, startTime: sequences[0].startTime, endTime: sequences[sequences.length - 1].endTime, positionEstimated: true };
  });
  return { shorts, usage };
}

export async function POST(request: Request) {
  const guard = await requireApiKey("openrouter");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as { transcript?: unknown; durationMinutes?: unknown; numberOfVideos?: unknown; model?: unknown };

  const transcript = typeof body.transcript === "string" ? body.transcript : "";
  if (transcript.trim().length < 80) return Response.json({ error: "transcript_too_short", detail: "Ajoutez une transcription plus complète." }, { status: 400 });
  // An unbounded transcript is an unbounded bill: cap it before the paid call.
  if (transcript.length > MAX_TRANSCRIPT) return Response.json({ error: "transcript_too_long", detail: "La transcription dépasse la taille maximale acceptée.", maxLength: MAX_TRANSCRIPT }, { status: 400 });

  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim().slice(0, 200) : DEFAULT_MODEL;
  const fixedDuration = ["1", "2", "3"].includes(String(body.durationMinutes ?? "auto")) ? Number(body.durationMinutes) : null;
  const requestedVideos = Math.min(MAX_VIDEOS, Math.max(1, Math.round(Number(body.numberOfVideos) || 10)));

  const cacheKey = await makeCacheKey("shorts-analyze-v1", userId, { transcript, durationMinutes: fixedDuration ?? "auto", requestedVideos, model });
  const cached = await readAiCache<{ shorts: GeneratedShort[] }>(cacheKey);
  if (cached?.shorts?.length === requestedVideos) return Response.json({ shorts: cached.shorts, usage: cachedUsage(model) });

  const durationInstruction = fixedDuration
    ? `Chaque extrait doit viser ${fixedDuration} minute${fixedDuration > 1 ? "s" : ""} (environ ${fixedDuration * 140} à ${fixedDuration * 170} mots). Indique ${fixedDuration} dans durationMinutes.`
    : "Choisis pour chaque idée une durée de 1, 2 ou 3 minutes selon la richesse du thème : 1 minute pour une idée simple, 2 minutes pour une explication structurée, 3 minutes pour un sujet qui exige du contexte. Indique ton choix dans durationMinutes.";
  const cues = parseSrt(transcript);

  try {
    if (cues.length) {
      const result = await generateTimedShorts(apiKey, model, cues, requestedVideos, fixedDuration);
      await writeAiCache(cacheKey, userId, "analyze", { shorts: result.shorts });
      return Response.json({ shorts: result.shorts, usage: result.usage });
    }

    const batches = Array.from({ length: Math.ceil(requestedVideos / BATCH_SIZE) }, (_, index) => {
      const start = index * BATCH_SIZE + 1;
      return { start, count: Math.min(BATCH_SIZE, requestedVideos - start + 1) };
    });
    const results = await Promise.all(batches.map(({ start, count }) => generatePlainBatch({ apiKey, model, transcript, durationInstruction, requestedVideos, start, count, fixedDuration })));
    const generatedShorts = results.flatMap(result => result.shorts).slice(0, requestedVideos);
    await writeAiCache(cacheKey, userId, "analyze", { shorts: generatedShorts });
    return Response.json({ shorts: generatedShorts, usage: addUsage(results.map(result => result.usage), model) });
  } catch (error) {
    if (error instanceof UpstreamError) return Response.json({ error: error.code, detail: error.message }, { status: error.status });
    if (isTimeout(error)) return Response.json({ error: "openrouter_timeout", detail: "L’analyse a dépassé le délai autorisé. Réessayez." }, { status: 504 });
    return Response.json({ error: "analysis_failed", detail: error instanceof Error ? error.message : "L’analyse IA a échoué." }, { status: 502 });
  }
}
