import { requireApiKey } from "../../server/secrets";
import { fetchUpstream, isTimeout, openRouterHeaders } from "../../server/http";
import { cachedUsage, makeCacheKey, readAiCache, writeAiCache, type AiUsage } from "../../server/ai-cache";

const DEFAULT_MODEL = "openai/gpt-5.4-mini";
const BATCH_SIZE = 8;
const MAX_SHORTS = 50;
const MAX_TEXT = 20_000;

type ShortInput = { index: number; text: string };
type TitleOption = { title: string; score: number; reason?: string };
type TitleResult = { index: number; titles: TitleOption[] };

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    cost?: number | string; prompt_tokens?: number; completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readUsage(data: OpenRouterResponse, model: string): AiUsage {
  const usage = data?.usage ?? {};
  return {
    model,
    cost: numberValue(usage.cost),
    promptTokens: numberValue(usage.prompt_tokens),
    completionTokens: numberValue(usage.completion_tokens),
    reasoningTokens: numberValue(usage.completion_tokens_details?.reasoning_tokens),
    cachedTokens: numberValue(usage.prompt_tokens_details?.cached_tokens),
    cacheHit: false,
  };
}

function aggregateUsage(usages: AiUsage[], model: string): AiUsage {
  return usages.reduce<AiUsage>((total, usage) => ({
    ...total,
    cost: total.cost + usage.cost,
    promptTokens: total.promptTokens + usage.promptTokens,
    completionTokens: total.completionTokens + usage.completionTokens,
    reasoningTokens: total.reasoningTokens + usage.reasoningTokens,
    cachedTokens: total.cachedTokens + usage.cachedTokens,
  }), { model, cost: 0, promptTokens: 0, completionTokens: 0, reasoningTokens: 0, cachedTokens: 0, cacheHit: false });
}

function validShorts(value: unknown): value is ShortInput[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_SHORTS && value.every(item =>
    item && typeof item === "object"
    && Number.isInteger((item as ShortInput).index)
    && typeof (item as ShortInput).text === "string"
    && (item as ShortInput).text.trim().length > 0
    && (item as ShortInput).text.length <= MAX_TEXT
  );
}

async function createTitles(apiKey: string, model: string, shorts: ShortInput[]) {
  const prompt = `Pour chacun des shorts ci-dessous, propose exactement 3 titres YouTube Shorts en français. Ils doivent être précis, intrigants et fidèles au texte. Donne un score éditorial de potentiel de clic entre 1 et 100. Conserve exactement la valeur index de chaque short. Réponds uniquement en JSON strict : {"results":[{"index":0,"titles":[{"title":"...","score":85,"reason":"..."}]}]}. Le tableau results doit contenir exactement ${shorts.length} éléments.\n\nSHORTS :\n${JSON.stringify(shorts)}`;
  const response = await fetchUpstream("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      reasoning: { effort: "none", exclude: true },
      max_tokens: Math.min(4000, Math.max(900, 300 + shorts.length * 360)),
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
    timeoutMs: 90_000,
  });
  if (!response.ok) {
    // Status and request id only: the upstream body can echo the submitted text.
    console.error("OpenRouter titles error", { status: response.status, requestId: response.headers.get("x-request-id") });
    throw new Error("Les titres ne sont pas disponibles pour le moment.");
  }
  const data = await response.json() as OpenRouterResponse;
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { results?: TitleResult[] };
  if (!Array.isArray(parsed.results)) throw new Error("Réponse IA invalide.");
  return { results: parsed.results, usage: readUsage(data, model) };
}

export async function POST(request: Request) {
  const guard = await requireApiKey("openrouter");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as { shorts?: unknown; model?: unknown };
  if (!validShorts(body.shorts)) return Response.json({ error: "invalid_shorts", detail: "Aucun short à titrer.", maxShorts: MAX_SHORTS }, { status: 400 });
  const shorts = body.shorts;
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim().slice(0, 200) : DEFAULT_MODEL;

  const cacheKey = await makeCacheKey("shorts-titles-v1", userId, { shorts, model });
  const cached = await readAiCache<{ results: TitleResult[] }>(cacheKey);
  if (cached?.results?.length === shorts.length) return Response.json({ results: cached.results, usage: cachedUsage(model) });

  const batches = Array.from({ length: Math.ceil(shorts.length / BATCH_SIZE) }, (_, index) => shorts.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
  try {
    const batchResults = await Promise.all(batches.map(batch => createTitles(apiKey, model, batch)));
    const results = batchResults.flatMap(batch => batch.results).sort((a, b) => a.index - b.index);
    await writeAiCache(cacheKey, userId, "titles", { results });
    return Response.json({ results, usage: aggregateUsage(batchResults.map(batch => batch.usage), model) });
  } catch (error) {
    if (isTimeout(error)) return Response.json({ error: "openrouter_timeout", detail: "La génération des titres a dépassé le délai autorisé. Réessayez." }, { status: 504 });
    return Response.json({ error: "titles_failed", detail: error instanceof Error ? error.message : "Les titres ne sont pas disponibles." }, { status: 502 });
  }
}
