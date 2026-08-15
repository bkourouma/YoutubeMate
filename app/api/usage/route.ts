import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { usageEvents } from "../../../db/schema";
import { requireUserId, unauthorizedResponse } from "../../server/identity";

const RECENT_LIMIT = 60;

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "authentication_required" }, { status: 401 });
  }
  try {
    const db = await getDb();
    const mine = eq(usageEvents.userId, userId);
    // Aggregated in SQL rather than in the worker: the totals stay exact however long
    // the ledger grows, while only the recent list is capped.
    const totals = sql<number>`sum(${usageEvents.costUsd})`;
    const calls = sql<number>`count(*)`;

    const [overall] = await db.select({
      cost: totals, calls,
      promptTokens: sql<number>`sum(${usageEvents.promptTokens})`,
      completionTokens: sql<number>`sum(${usageEvents.completionTokens})`,
      reasoningTokens: sql<number>`sum(${usageEvents.reasoningTokens})`,
      cachedTokens: sql<number>`sum(${usageEvents.cachedTokens})`,
      images: sql<number>`sum(${usageEvents.images})`,
      cacheHits: sql<number>`sum(${usageEvents.cacheHit})`,
      first: sql<string>`min(${usageEvents.createdAt})`,
    }).from(usageEvents).where(mine);

    const byProject = await db.select({
      projectId: usageEvents.projectId,
      title: sql<string>`max(${usageEvents.projectTitle})`,
      pipeline: sql<string>`max(${usageEvents.pipeline})`,
      cost: totals, calls,
      images: sql<number>`sum(${usageEvents.images})`,
      last: sql<string>`max(${usageEvents.createdAt})`,
    }).from(usageEvents).where(mine).groupBy(usageEvents.projectId).orderBy(desc(totals));

    // Per project AND per action: the request was for both levels, not a project total
    // that leaves you guessing which step spent it.
    const byProjectAction = await db.select({
      projectId: usageEvents.projectId,
      action: usageEvents.action,
      model: sql<string>`max(${usageEvents.model})`,
      cost: totals, calls,
      cacheHits: sql<number>`sum(${usageEvents.cacheHit})`,
    }).from(usageEvents).where(mine).groupBy(usageEvents.projectId, usageEvents.action).orderBy(desc(totals));

    const byModel = await db.select({
      model: usageEvents.model, provider: usageEvents.provider, cost: totals, calls,
    }).from(usageEvents).where(mine).groupBy(usageEvents.model, usageEvents.provider).orderBy(desc(totals));

    const recent = await db.select().from(usageEvents).where(mine).orderBy(desc(usageEvents.createdAt)).limit(RECENT_LIMIT);

    return Response.json({
      total: {
        cost: overall?.cost ?? 0, calls: overall?.calls ?? 0,
        promptTokens: overall?.promptTokens ?? 0, completionTokens: overall?.completionTokens ?? 0,
        reasoningTokens: overall?.reasoningTokens ?? 0, cachedTokens: overall?.cachedTokens ?? 0,
        images: overall?.images ?? 0, cacheHits: overall?.cacheHits ?? 0, since: overall?.first ?? null,
      },
      byProject, byProjectAction, byModel, recent, recentLimit: RECENT_LIMIT,
    });
  } catch {
    return Response.json({ error: "usage_unavailable" }, { status: 503 });
  }
}

/** Clears the ledger, or one project's slice of it. Never another user's. */
export async function DELETE(request: Request) {
  let userId: string;
  try { userId = await requireUserId(); } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "authentication_required" }, { status: 401 });
  }
  try {
    const projectId = new URL(request.url).searchParams.get("projectId");
    const db = await getDb();
    await db.delete(usageEvents).where(
      projectId === null ? eq(usageEvents.userId, userId) : and(eq(usageEvents.userId, userId), eq(usageEvents.projectId, projectId)),
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "usage_delete_failed" }, { status: 503 });
  }
}
