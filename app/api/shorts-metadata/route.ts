import { requireApiKey } from "../../server/secrets";
import { fetchUpstream, isTimeout, openRouterHeaders } from "../../server/http";
import { cachedUsage, makeCacheKey, readAiCache, writeAiCache, type AiUsage } from "../../server/ai-cache";

const DEFAULT_MODEL = "openai/gpt-5.4-nano";
const BATCH_SIZE = 4;
const MAX_ITEMS = 50;
const MAX_TEXT = 20_000;

type MetadataInput = { index: number; title: string; text: string };
type ThumbnailConcept = { name: string; hook: string; visual: string; overlayText: string; palette: string; prompt: string };
type MetadataResult = { index: number; description: string; tags: string[]; thumbnailConcepts: ThumbnailConcept[] };

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: {
    cost?: number | string; prompt_tokens?: number; completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

/** Truncation is recoverable by splitting the batch; other failures are not. */
class IncompleteMetadataResponse extends Error {}

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

function validItems(value: unknown): value is MetadataInput[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_ITEMS && value.every(item =>
    item && typeof item === "object"
    && Number.isInteger((item as MetadataInput).index)
    && typeof (item as MetadataInput).title === "string" && (item as MetadataInput).title.length <= 300
    && typeof (item as MetadataInput).text === "string" && (item as MetadataInput).text.length <= MAX_TEXT
  );
}

async function createMetadata(apiKey: string, model: string, items: MetadataInput[]) {
  const prompt = `Pour chaque short ci-dessous, crée :
1. une description YouTube en français en 2 phrases avec un appel vers la vidéo complète ;
2. exactement 8 tags pertinents ;
3. exactement 3 concepts de miniature YouTube réellement distincts.

Chaque concept de miniature doit contenir :
- name : un nom court qui résume l'angle créatif ;
- hook : la promesse ou l'émotion principale ;
- visual : la composition précise, le sujet principal et l'arrière-plan ;
- overlayText : un texte très lisible de 2 à 6 mots maximum ;
- palette : 2 à 4 couleurs et l'ambiance ;
- prompt : une instruction autonome et détaillée pour produire une seule miniature verticale YouTube Shorts 9:16 (720 × 1280), pensée pour un écran mobile, avec le sujet et le texte essentiel dans la zone centrale, sans logo ni filigrane.

Les trois concepts doivent varier par leur angle, leur composition et leur traitement visuel. Conserve exactement la valeur index de chaque short. Réponds uniquement en JSON strict : {"results":[{"index":0,"description":"...","tags":["..."],"thumbnailConcepts":[{"name":"...","hook":"...","visual":"...","overlayText":"...","palette":"...","prompt":"..."}]}]}. Le tableau results doit contenir exactement ${items.length} éléments et chaque thumbnailConcepts exactement 3 éléments.\n\nSHORTS :\n${JSON.stringify(items)}`;
  const response = await fetchUpstream("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      reasoning: { effort: "none", exclude: true },
      max_tokens: Math.min(6000, Math.max(2400, 1200 + items.length * 900)),
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
    timeoutMs: 90_000,
  });
  if (!response.ok) {
    console.error("OpenRouter metadata error", { status: response.status, requestId: response.headers.get("x-request-id") });
    throw new Error("Les descriptions ne sont pas disponibles pour le moment.");
  }
  const data = await response.json() as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  let parsed: { results?: MetadataResult[] };
  try {
    parsed = JSON.parse(content) as { results?: MetadataResult[] };
  } catch {
    console.error("OpenRouter metadata returned incomplete JSON", {
      finishReason: data.choices?.[0]?.finish_reason ?? null,
      contentLength: content.length,
      itemCount: items.length,
    });
    throw new IncompleteMetadataResponse("La réponse IA est incomplète.");
  }
  const expectedIndexes = new Set(items.map(item => item.index));
  if (!Array.isArray(parsed.results)
    || parsed.results.length !== items.length
    || parsed.results.some(item => !expectedIndexes.has(item.index)
      || !Array.isArray(item.tags)
      || !Array.isArray(item.thumbnailConcepts)
      || item.thumbnailConcepts.length !== 3)) {
    throw new IncompleteMetadataResponse("La réponse IA est incomplète.");
  }
  return { results: parsed.results, usage: readUsage(data, model) };
}

/** On truncation, halve the batch and retry — smaller prompts fit in the token budget. */
async function createMetadataReliably(apiKey: string, model: string, items: MetadataInput[]): Promise<Array<{ results: MetadataResult[]; usage: AiUsage }>> {
  try {
    return [await createMetadata(apiKey, model, items)];
  } catch (error) {
    if (!(error instanceof IncompleteMetadataResponse)) throw error;
    if (items.length === 1) {
      try {
        return [await createMetadata(apiKey, model, items)];
      } catch (retryError) {
        if (retryError instanceof IncompleteMetadataResponse) throw new Error("Une fiche YouTube n’a pas pu être générée complètement. Réessayez dans un instant.");
        throw retryError;
      }
    }
    const middle = Math.ceil(items.length / 2);
    const [left, right] = await Promise.all([
      createMetadataReliably(apiKey, model, items.slice(0, middle)),
      createMetadataReliably(apiKey, model, items.slice(middle)),
    ]);
    return [...left, ...right];
  }
}

export async function POST(request: Request) {
  const guard = await requireApiKey("openrouter");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as { items?: unknown; model?: unknown };
  if (!validItems(body.items)) return Response.json({ error: "invalid_items", detail: "Aucun short à décrire.", maxItems: MAX_ITEMS }, { status: 400 });
  const items = body.items;
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim().slice(0, 200) : DEFAULT_MODEL;

  const cacheKey = await makeCacheKey("shorts-metadata-v1", userId, { items, model });
  const cached = await readAiCache<{ results: MetadataResult[] }>(cacheKey);
  if (cached?.results?.length === items.length) return Response.json({ results: cached.results, usage: cachedUsage(model) });

  const batches = Array.from({ length: Math.ceil(items.length / BATCH_SIZE) }, (_, index) => items.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
  try {
    const batchResults = (await Promise.all(batches.map(batch => createMetadataReliably(apiKey, model, batch)))).flat();
    const results = batchResults.flatMap(batch => batch.results).sort((a, b) => a.index - b.index);
    await writeAiCache(cacheKey, userId, "metadata", { results });
    return Response.json({ results, usage: aggregateUsage(batchResults.map(batch => batch.usage), model) });
  } catch (error) {
    if (isTimeout(error)) return Response.json({ error: "openrouter_timeout", detail: "La génération des fiches a dépassé le délai autorisé. Réessayez." }, { status: 504 });
    return Response.json({ error: "metadata_failed", detail: error instanceof Error ? error.message : "Les descriptions ne sont pas disponibles." }, { status: 502 });
  }
}
