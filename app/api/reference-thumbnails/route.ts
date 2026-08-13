import { env } from "cloudflare:workers";
import { headers } from "next/headers";

const MAX_REFERENCES = 4;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function bucket() {
  const runtime = env as unknown as { BUCKET?: R2Bucket };
  if (!runtime.BUCKET) throw new Error("reference_storage_unavailable");
  return runtime.BUCKET;
}

async function userPrefix() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id") ?? "local-preview";
  return `reference-thumbnails/${encodeURIComponent(userId)}/`;
}

export async function GET(request: Request) {
  try {
    const prefix = await userPrefix();
    const requestedKey = new URL(request.url).searchParams.get("key");
    if (requestedKey) {
      if (!requestedKey.startsWith(prefix)) return Response.json({ error: "reference_forbidden" }, { status: 403 });
      const object = await bucket().get(requestedKey);
      if (!object) return Response.json({ error: "reference_not_found" }, { status: 404 });
      return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "private, max-age=3600" } });
    }
    const listed = await bucket().list({ prefix, limit: MAX_REFERENCES });
    const sorted = listed.objects.sort((a, b) => (a.uploaded?.getTime() ?? 0) - (b.uploaded?.getTime() ?? 0));
    const details = await Promise.all(sorted.map(object => bucket().head(object.key)));
    const references = sorted.map((object, index) => ({
      key: object.key,
      name: details[index]?.customMetadata?.originalName ?? "miniature-reference",
      contentType: details[index]?.httpMetadata?.contentType ?? "image/jpeg",
      size: object.size,
      uploadedAt: object.uploaded?.toISOString() ?? "",
      url: `/api/reference-thumbnails?key=${encodeURIComponent(object.key)}`,
    }));
    return Response.json({ references, max: MAX_REFERENCES });
  } catch {
    return Response.json({ error: "reference_storage_unavailable", references: [] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const prefix = await userPrefix();
    const existing = await bucket().list({ prefix, limit: MAX_REFERENCES });
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length) return Response.json({ error: "reference_file_required" }, { status: 400 });
    if (existing.objects.length + files.length > MAX_REFERENCES) return Response.json({ error: "reference_limit_reached", max: MAX_REFERENCES }, { status: 400 });
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) return Response.json({ error: "invalid_reference_file", maxBytes: MAX_FILE_SIZE }, { status: 400 });
    }
    await Promise.all(files.map(file => {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const key = `${prefix}${crypto.randomUUID()}.${extension}`;
      return bucket().put(key, file, { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name.slice(0, 180), uploadedAt: new Date().toISOString() } });
    }));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "reference_upload_failed" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const prefix = await userPrefix();
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key.startsWith(prefix)) return Response.json({ error: "reference_forbidden" }, { status: 403 });
    await bucket().delete(key);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "reference_delete_failed" }, { status: 503 });
  }
}
