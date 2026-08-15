import { getDb } from "../../db";
import { usageEvents } from "../../db/schema";
import type { Pipeline, TokenUsage } from "./pricing";

export { emptyUsage, openAiImageUsage, openRouterUsage, type Pipeline, type TokenUsage } from "./pricing";

export type UsageEntry = {
  userId: string;
  projectId?: string;
  projectTitle?: string;
  pipeline: Pipeline;
  action: string;
  provider: "openrouter" | "openai";
  usage: TokenUsage;
  images?: number;
};

/**
 * Never throws. The call it accounts for has already been paid for and has already
 * returned a result; losing the bookkeeping is annoying, losing the result is not
 * acceptable. A failure here is swallowed rather than propagated to the caller.
 */
export async function recordUsage(entry: UsageEntry) {
  try {
    await (await getDb()).insert(usageEvents).values({
      id: crypto.randomUUID(),
      userId: entry.userId,
      projectId: (entry.projectId ?? "").slice(0, 120),
      projectTitle: (entry.projectTitle ?? "").slice(0, 300),
      pipeline: entry.pipeline,
      action: entry.action.slice(0, 80),
      provider: entry.provider,
      model: entry.usage.model.slice(0, 200),
      costUsd: entry.usage.cost,
      promptTokens: entry.usage.promptTokens,
      completionTokens: entry.usage.completionTokens,
      reasoningTokens: entry.usage.reasoningTokens,
      cachedTokens: entry.usage.cachedTokens,
      images: entry.images ?? 0,
      cacheHit: entry.usage.cacheHit ? 1 : 0,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Accounting is best-effort by design; see the note above.
  }
}

/** Trusted only as a label: the client names its own project, it never names its owner. */
export function projectRef(body: { projectId?: unknown; projectTitle?: unknown }) {
  return {
    projectId: typeof body.projectId === "string" ? body.projectId.slice(0, 120) : "",
    projectTitle: typeof body.projectTitle === "string" ? body.projectTitle.slice(0, 300) : "",
  };
}
