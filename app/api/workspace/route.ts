import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "../../../db";
import { workspaces } from "../../../db/schema";

async function userId() {
  const h = await headers();
  return h.get("oai-authenticated-user-id") ?? "local-preview";
}

export async function GET() {
  try {
    const id = await userId();
    const rows = await getDb().select().from(workspaces).where(eq(workspaces.userId, id)).limit(1);
    return Response.json({ payload: rows[0] ? JSON.parse(rows[0].payload) : null });
  } catch {
    return Response.json({ payload: null, offline: true });
  }
}

export async function PUT(request: Request) {
  try {
    const id = await userId();
    const payload = await request.json();
    const serialized = JSON.stringify(payload);
    if (serialized.length > 900_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
    await getDb().insert(workspaces).values({ userId: id, payload: serialized })
      .onConflictDoUpdate({ target: workspaces.userId, set: { payload: serialized, updatedAt: new Date().toISOString() } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, offline: true }, { status: 503 });
  }
}
