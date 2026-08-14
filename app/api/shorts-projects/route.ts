import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { shortsProjects } from "../../../db/schema";
import { withUser } from "../../server/identity";

const MAX_PROJECTS = 50;
const MAX_PAYLOAD = 1_500_000;

type RequestBody = { id?: string; name?: string; stage?: number; state?: unknown };

export async function GET() {
  return withUser(async userId => {
    try {
      const rows = await (await getDb()).select().from(shortsProjects)
        .where(eq(shortsProjects.userId, userId)).orderBy(desc(shortsProjects.updatedAt)).limit(MAX_PROJECTS);
      const projects = rows.map(row => {
        let state: unknown = null;
        // One corrupt row must not take down the whole list.
        try { state = JSON.parse(row.statePayload); } catch { state = null; }
        return { id: row.id, name: row.name, stage: row.stage, state, createdAt: row.createdAt, updatedAt: row.updatedAt };
      });
      return Response.json({ projects });
    } catch {
      return Response.json({ projects: [], offline: true }, { status: 503 });
    }
  });
}

export async function POST(request: Request) {
  return withUser(async userId => {
    let rawBody: unknown;
    try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
    const body = rawBody as RequestBody;
    const name = (typeof body.name === "string" ? body.name.trim() : "").slice(0, 120) || "Projet sans titre";
    const stage = Math.min(4, Math.max(1, Math.round(Number(body.stage) || 1)));
    const statePayload = JSON.stringify(body.state ?? {});
    if (statePayload.length > MAX_PAYLOAD) return Response.json({ error: "payload_too_large", maxLength: MAX_PAYLOAD }, { status: 413 });
    const now = new Date().toISOString();

    try {
      const database = await getDb();
      if (typeof body.id === "string" && body.id) {
        // Scoped by owner: a known id from another account must not be writable.
        const updated = await database.update(shortsProjects)
          .set({ name, stage, statePayload, updatedAt: now })
          .where(and(eq(shortsProjects.id, body.id), eq(shortsProjects.userId, userId))).returning({ id: shortsProjects.id });
        if (updated.length) return Response.json({ id: updated[0].id });
      }
      // Enforce the cap on write, not just on read: nothing capped growth before.
      const existing = await database.select({ id: shortsProjects.id }).from(shortsProjects)
        .where(eq(shortsProjects.userId, userId)).orderBy(asc(shortsProjects.updatedAt));
      const surplus = existing.slice(0, Math.max(0, existing.length + 1 - MAX_PROJECTS));
      for (const row of surplus) {
        await database.delete(shortsProjects).where(and(eq(shortsProjects.id, row.id), eq(shortsProjects.userId, userId)));
      }
      const id = crypto.randomUUID();
      await database.insert(shortsProjects).values({ id, userId, name, stage, statePayload, createdAt: now, updatedAt: now });
      return Response.json({ id, evicted: surplus.length });
    } catch {
      return Response.json({ error: "shorts_project_save_failed" }, { status: 503 });
    }
  });
}

export async function DELETE(request: Request) {
  return withUser(async userId => {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "missing_id" }, { status: 400 });
    try {
      const deleted = await (await getDb()).delete(shortsProjects)
        .where(and(eq(shortsProjects.id, id), eq(shortsProjects.userId, userId))).returning({ id: shortsProjects.id });
      if (!deleted.length) return Response.json({ error: "not_found" }, { status: 404 });
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "shorts_project_delete_failed" }, { status: 503 });
    }
  });
}
