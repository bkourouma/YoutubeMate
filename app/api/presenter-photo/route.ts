import { env } from "cloudflare:workers";
import { requireUserId, unauthorizedResponse } from "../../server/identity";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
// The client re-encodes to JPEG before uploading, so these are the fallback formats
// for browsers where that conversion is unavailable.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function bucket() {
  const runtime = env as unknown as { BUCKET?: R2Bucket };
  if (!runtime.BUCKET) throw new Error("presenter_storage_unavailable");
  return runtime.BUCKET;
}

/** One photo per user. A stable key means replacing it simply overwrites the old one. */
async function photoPrefix() {
  return `presenter-photo/${encodeURIComponent(await requireUserId())}/`;
}

export async function GET(request: Request) {
  try {
    const prefix = await photoPrefix();
    const requestedKey = new URL(request.url).searchParams.get("key");
    if (requestedKey) {
      if (!requestedKey.startsWith(prefix)) return Response.json({ error: "presenter_forbidden" }, { status: 403 });
      const object = await bucket().get(requestedKey);
      if (!object) return Response.json({ error: "presenter_not_found" }, { status: 404 });
      return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "private, max-age=3600" } });
    }
    const listed = await bucket().list({ prefix, limit: 1 });
    const object = listed.objects[0];
    if (!object) return Response.json({ photo: null });
    return Response.json({ photo: { key: object.key, size: object.size, uploadedAt: object.uploaded?.toISOString() ?? "", url: `/api/presenter-photo?key=${encodeURIComponent(object.key)}` } });
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "presenter_storage_unavailable", photo: null }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const prefix = await photoPrefix();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "presenter_file_required" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) return Response.json({ error: "invalid_presenter_file", maxBytes: MAX_FILE_SIZE }, { status: 400 });
    // Replace rather than accumulate: there is only ever one presenter.
    const existing = await bucket().list({ prefix, limit: 10 });
    await Promise.all(existing.objects.map(object => bucket().delete(object.key)));
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = `${prefix}${crypto.randomUUID()}.${extension}`;
    await bucket().put(key, file, { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name.slice(0, 180), uploadedAt: new Date().toISOString() } });
    return Response.json({ photo: { key, size: file.size, uploadedAt: new Date().toISOString(), url: `/api/presenter-photo?key=${encodeURIComponent(key)}` } });
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "presenter_upload_failed" }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    const prefix = await photoPrefix();
    const listed = await bucket().list({ prefix, limit: 10 });
    await Promise.all(listed.objects.map(object => bucket().delete(object.key)));
    return Response.json({ ok: true, photo: null });
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "presenter_delete_failed" }, { status: 503 });
  }
}
