/**
 * Polls until `check` returns a value, bounded by wall-clock time rather than an
 * attempt count. Attempt counts hide their real cost: 150 attempts × 2 s is five
 * minutes inside one request, which a Worker will not hold.
 */
export async function pollUntil<T>(check: () => Promise<T | null>, options: { intervalMs: number; deadlineMs: number; signal?: AbortSignal }): Promise<T> {
  const deadline = Date.now() + options.deadlineMs;
  for (;;) {
    if (options.signal?.aborted) throw new Error("poll_aborted");
    const result = await check();
    if (result !== null) return result;
    if (Date.now() + options.intervalMs >= deadline) throw new PollTimeoutError();
    await new Promise(resolve => setTimeout(resolve, options.intervalMs));
  }
}

export class PollTimeoutError extends Error {
  constructor() { super("poll_timeout"); this.name = "PollTimeoutError"; }
}
