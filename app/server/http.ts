import { product } from "../config/product";
/**
 * Every outbound call gets a deadline. Without one a hung provider holds a Worker
 * request open until the platform kills it, and the user sees nothing but a spinner.
 */
export async function fetchUpstream(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 30_000, ...rest } = init;
  return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}

export function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/**
 * Attribution headers for OpenRouter. The referer follows the deployment rather than
 * a hard-coded domain: it was still naming the app's previous host after the rename.
 */
export function openRouterHeaders(apiKey: string) {
  return {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
    "http-referer": (process.env.PUBLIC_APP_ORIGIN?.trim() || "https://youtubemate.local").replace(/\/+$/, "") + "/",
    "x-title": product.name,
  };
}
