import { requireApiKey } from "../../server/secrets";
import { fetchUpstream, isTimeout, openRouterHeaders } from "../../server/http";
import { cachedUsage, makeCacheKey, readAiCache, writeAiCache, type AiUsage } from "../../server/ai-cache";

const DEFAULT_MODEL = "openai/gpt-5.4-mini";
const MAX_TITLE = 220;

type TitleOption = { title: string; score: number; reason?: string };
type ThumbnailConcept = { name: string; hook: string; visual: string; overlayText: string; palette: string; prompt: string };
type ExpressPackage = { titles: TitleOption[]; description: string; tags: string[]; thumbnailConcepts: ThumbnailConcept[] };

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

function parseJsonContent(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced ?? content).trim();
  try { return JSON.parse(source) as Record<string, unknown>; } catch {
    const first = source.indexOf("{");
    const last = source.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(source.slice(first, last + 1)) as Record<string, unknown>;
    throw new Error("invalid_json");
  }
}

/** The shape the UI depends on; anything looser would surface as a broken card. */
function validPackage(value: unknown): value is ExpressPackage {
  const candidate = value as ExpressPackage | undefined;
  return Boolean(candidate)
    && Array.isArray(candidate!.titles) && candidate!.titles.length === 3
    && candidate!.titles.every(option => typeof option.title === "string" && option.title.trim() && Number.isFinite(Number(option.score)))
    && typeof candidate!.description === "string" && candidate!.description.trim().length > 0
    && Array.isArray(candidate!.tags) && candidate!.tags.length >= 5
    && Array.isArray(candidate!.thumbnailConcepts) && candidate!.thumbnailConcepts.length === 3
    && candidate!.thumbnailConcepts.every(concept => typeof concept.name === "string" && typeof concept.prompt === "string" && concept.prompt.trim());
}

export async function POST(request: Request) {
  const guard = await requireApiKey("openrouter");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
  const body = rawBody as { originalTitle?: unknown; model?: unknown; language?: unknown; profile?: { channel?: string; theme?: string; audience?: string; tone?: string; descriptionFooter?: string } };

  const originalTitle = typeof body.originalTitle === "string" ? body.originalTitle.trim().slice(0, MAX_TITLE) : "";
  if (!originalTitle) return Response.json({ error: "missing_title", detail: "Ajoutez le titre de votre vidéo." }, { status: 400 });
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim().slice(0, 200) : DEFAULT_MODEL;
  const language = body.language === "en" ? "English" : "French";
  const profile = body.profile ?? {};

  const cacheKey = await makeCacheKey("shorts-express-v1", userId, { originalTitle, model, language, profile });
  const cached = await readAiCache<{ package: ExpressPackage }>(cacheKey);
  if (cached?.package && validPackage(cached.package)) return Response.json({ package: cached.package, usage: cachedUsage(model) });

  // Unlike the studio pipeline there is no transcript here, so the channel profile is
  // the only grounding available — without it the copy reads like anyone's channel.
  const system = `You are a senior YouTube Shorts packaging strategist. Return only valid JSON matching: {"titles":[{"title":"...","score":85,"reason":"..."}],"description":"...","tags":["..."],"thumbnailConcepts":[{"name":"...","hook":"...","visual":"...","overlayText":"...","palette":"...","prompt":"..."}]}.
Rules: write viewer-facing copy in ${language}; produce exactly 3 alternative titles, each under 100 characters, scored 1-100 on click potential with a one-line reason, ranked best first; write one description of 2 to 3 sentences; produce exactly 8 specific tags; produce exactly 3 genuinely distinct thumbnail concepts, each with a detailed English image prompt composed for a 9:16 vertical YouTube Shorts thumbnail, subject and essential text kept in the central area, no logo and no watermark; the overlayText headline is rendered into the image, so compose a large uncluttered high-contrast area to hold it; a prompt may also call for a few short supporting text elements — a badge, a sticker, a number — and every word meant to appear in the image must be quoted exactly and written in ${language}. The scores are your own editorial estimate: never present them as data from an analytics account. Never invent figures, prices, links, offers, results or guarantees that were not supplied.`;
  const user = `CHANNEL: ${profile.channel ?? ""}\nTHEME: ${profile.theme ?? ""}\nAUDIENCE: ${profile.audience ?? ""}\nTONE: ${profile.tone ?? ""}\nWORKING TITLE OF THE SHORT: ${originalTitle}`;

  try {
    const response = await fetchUpstream("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.7,
        max_tokens: 2600,
        response_format: { type: "json_object" },
        plugins: [{ id: "response-healing" }],
      }),
      timeoutMs: 90_000,
    });
    const upstream = await response.json() as OpenRouterResponse & { error?: { message?: string } };
    if (!response.ok) {
      console.error("OpenRouter express error", { status: response.status, requestId: response.headers.get("x-request-id") });
      return Response.json({ error: "express_failed", detail: upstream.error?.message ?? "Le packaging n’est pas disponible." }, { status: response.status === 401 ? 401 : 502 });
    }
    const content = upstream.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "express_empty_response" }, { status: 502 });
    const parsed = parseJsonContent(content);
    if (!validPackage(parsed)) return Response.json({ error: "express_invalid_shape" }, { status: 502 });
    const footer = profile.descriptionFooter?.trim();
    const result: ExpressPackage = {
      ...parsed,
      titles: parsed.titles.slice(0, 3).map(option => ({ ...option, score: Math.min(100, Math.max(1, Math.round(Number(option.score)))) })),
      description: footer && !parsed.description.includes(footer) ? `${parsed.description.trim()}\n\n${footer}` : parsed.description.trim(),
    };
    await writeAiCache(cacheKey, userId, "shorts-express", { package: result });
    return Response.json({ package: result, usage: readUsage(upstream, model) });
  } catch (error) {
    if (isTimeout(error)) return Response.json({ error: "openrouter_timeout", detail: "Le packaging a dépassé le délai autorisé. Réessayez." }, { status: 504 });
    return Response.json({ error: "express_failed", detail: error instanceof Error ? error.message : "Le packaging n’est pas disponible." }, { status: 502 });
  }
}
