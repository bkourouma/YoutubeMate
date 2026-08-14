import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { aiCache } from "../../db/schema";

export type AiUsage = {
  model: string;
  cost: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  cacheHit: boolean;
};

/** The owner is part of the hash, so cache entries never cross tenants. */
export async function makeCacheKey(kind: string, userId: string, value: unknown) {
  const bytes = new TextEncoder().encode(`${kind}:${userId}:${JSON.stringify(value)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function readAiCache<T>(key: string): Promise<T | null> {
  try {
    const [row] = await (await getDb()).select().from(aiCache).where(eq(aiCache.key, key)).limit(1);
    return row ? JSON.parse(row.payload) as T : null;
  } catch {
    return null;
  }
}

export async function writeAiCache(key: string, userId: string, kind: string, value: unknown) {
  try {
    const payload = JSON.stringify(value);
    const createdAt = new Date().toISOString();
    await (await getDb()).insert(aiCache).values({ key, userId, kind, payload, createdAt })
      .onConflictDoUpdate({ target: aiCache.key, set: { payload, createdAt } });
  } catch {
    // A creative workflow must stay available when the cache is momentarily unavailable.
  }
}

export function cachedUsage(model: string): AiUsage {
  return { model, cost: 0, promptTokens: 0, completionTokens: 0, reasoningTokens: 0, cachedTokens: 0, cacheHit: true };
}
