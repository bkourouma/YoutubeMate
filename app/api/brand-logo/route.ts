import { env } from "cloudflare:workers";
import { requireUserId, unauthorizedResponse } from "../../server/identity";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
// Word embeds PNG and JPEG natively. SVG and WebP are refused here rather than at
// export time, where the failure would be silent and the document simply logo-less.
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

function bucket() {
  const runtime = env as unknown as { BUCKET?: R2Bucket };
  if (!runtime.BUCKET) throw new Error("logo_storage_unavailable");
  return runtime.BUCKET;
}

/** One logo per user, in its own namespace — never mixed with the style references. */
async function logoPrefix() {
  return `brand-logo/${encodeURIComponent(await requireUserId())}/`;
}

export async function GET(request: Request) {
  try {
    const prefix = await logoPrefix();
    const requestedKey = new URL(request.url).searchParams.get("key");
    if (requestedKey) {
      if (!requestedKey.startsWith(prefix)) return Response.json({ error: "logo_forbidden" }, { status: 403 });
      const object = await bucket().get(requestedKey);
      if (!object) return Response.json({ error: "logo_not_found" }, { status: 404 });
      return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/png", "cache-control": "private, max-age=3600" } });
    }
    const listed = await bucket().list({ prefix, limit: 1 });
    const object = listed.objects[0];
    if (!object) return Response.json({ logo: null });
    return Response.json({ logo: { key: object.key, size: object.size, url: `/api/brand-logo?key=${encodeURIComponent(object.key)}` } });
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "logo_storage_unavailable", logo: null }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const prefix = await logoPrefix();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "logo_file_required" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) return Response.json({ error: "invalid_logo_file", maxBytes: MAX_FILE_SIZE }, { status: 400 });
    const existing = await bucket().list({ prefix, limit: 10 });
    await Promise.all(existing.objects.map(object => bucket().delete(object.key)));
    const key = `${prefix}${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
    await bucket().put(key, file, { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name.slice(0, 180), uploadedAt: new Date().toISOString() } });
    return Response.json({ logo: { key, size: file.size, url: `/api/brand-logo?key=${encodeURIComponent(key)}` } });
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "logo_upload_failed" }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    const prefix = await logoPrefix();
    const listed = await bucket().list({ prefix, limit: 10 });
    await Promise.all(listed.objects.map(object => bucket().delete(object.key)));
    return Response.json({ ok: true, logo: null });
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "logo_delete_failed" }, { status: 503 });
  }
}
