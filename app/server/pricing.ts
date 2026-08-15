/**
 * What a call cost. Pure: given a provider's response it returns money and tokens, with
 * no database behind it, so it can be exercised directly.
 */
export type Pipeline = "script" | "express" | "shorts" | "shorts-express" | "profile";

export type TokenUsage = {
  model: string;
  cost: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  cacheHit: boolean;
};

export const emptyUsage = (model: string): TokenUsage => ({
  model, cost: 0, promptTokens: 0, completionTokens: 0, reasoningTokens: 0, cachedTokens: 0, cacheHit: false,
});

type OpenRouterUsagePayload = {
  usage?: {
    cost?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

/**
 * OpenRouter returns the amount actually charged in `usage.cost` on every response — no
 * request parameter is needed for it. Taking the provider's own figure means the ledger
 * cannot drift from the bill through a stale rate table.
 */
export function openRouterUsage(payload: { usage?: unknown }, model: string): TokenUsage {
  const usage = (payload.usage ?? undefined) as OpenRouterUsagePayload["usage"];
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

/**
 * The images endpoint bills tokens, not pictures, and returns no cost — so this is the
 * one place a rate table is unavoidable. Dollars per million tokens, as published by
 * OpenAI and as displayed in the model picker.
 */
const IMAGE_RATES: Record<string, { textIn: number; imageIn: number; cachedIn: number; out: number }> = {
  "gpt-image-2": { textIn: 5, imageIn: 8, cachedIn: 2, out: 30 },
  "gpt-image-1.5": { textIn: 5, imageIn: 8, cachedIn: 2, out: 32 },
};

type OpenAiImageUsage = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { text_tokens?: number; image_tokens?: number; cached_tokens?: number };
};

export function openAiImageUsage(usage: OpenAiImageUsage | undefined, model: string): TokenUsage {
  const rate = IMAGE_RATES[model] ?? IMAGE_RATES["gpt-image-2"];
  const details = usage?.input_tokens_details;
  const cached = Number(details?.cached_tokens ?? 0) || 0;
  const imageIn = Math.max(0, (Number(details?.image_tokens ?? 0) || 0) - cached);
  const totalIn = Number(usage?.input_tokens ?? 0) || 0;
  // Whatever the response does not break down is billed at the text rate, the cheapest
  // of the three: an unknown split must not inflate the figure the user is shown.
  const textIn = Math.max(0, totalIn - imageIn - cached) || (details ? Number(details.text_tokens ?? 0) || 0 : totalIn);
  const out = Number(usage?.output_tokens ?? 0) || 0;
  const cost = (textIn * rate.textIn + imageIn * rate.imageIn + cached * rate.cachedIn + out * rate.out) / 1_000_000;
  return { model, cost, promptTokens: totalIn, completionTokens: out, reasoningTokens: 0, cachedTokens: cached, cacheHit: false };
}
