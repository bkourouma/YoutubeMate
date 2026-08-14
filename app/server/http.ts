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

export function openRouterHeaders(apiKey: string) {
  return {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
    "http-referer": "https://script-studio-youtube.bkourouma.chatgpt.site/",
    "x-title": "YoutubeMate",
  };
}
