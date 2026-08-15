import { and, eq, lt } from "drizzle-orm";
import { getDb } from "../../db";
import { oauthStates, youtubeAuth } from "../../db/schema";
import { fetchUpstream } from "./http";

const STATE_TTL_MS = 10 * 60 * 1000;
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

export class YoutubeNotConnectedError extends Error {
  constructor() { super("youtube_not_connected"); this.name = "YoutubeNotConnectedError"; }
}

/**
 * The origin to build redirect URIs and public asset URLs from. Never derived from the
 * request Host header: a forged Host would steer Google's redirect — and the media URL
 * handed to Descript — at an attacker-chosen origin.
 */
export function publicOrigin(request: Request) {
  const configured = process.env.PUBLIC_APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const origin = new URL(request.url).origin;
  // Falling back to the request origin is a development convenience only.
  if (process.env.DEV_USER_ID && /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin)) return origin;
  throw new Error("public_origin_not_configured");
}

async function encryptionKey() {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret) throw new Error("settings_encryption_key_missing");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function additionalData(userId: string) {
  return new TextEncoder().encode(`${userId}:youtube`);
}

const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));

export async function startOAuth(userId: string, request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("google_client_not_configured");
  const state = crypto.randomUUID();
  const now = Date.now();
  const database = await getDb();
  // Sweep expired states here rather than with a scheduled job: the table stays small.
  await database.delete(oauthStates).where(lt(oauthStates.createdAt, new Date(now - STATE_TTL_MS).toISOString()));
  await database.insert(oauthStates).values({ state, userId, provider: "youtube", createdAt: new Date(now).toISOString() });
  const parameters = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${publicOrigin(request)}/api/youtube/callback`,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parameters.toString()}`;
}

/** Consumes the state row: a replayed state finds nothing and is rejected. */
export async function consumeOAuthState(state: string) {
  if (!state) return null;
  const database = await getDb();
  const [row] = await database.select().from(oauthStates)
    .where(and(eq(oauthStates.state, state), eq(oauthStates.provider, "youtube"))).limit(1);
  if (!row) return null;
  await database.delete(oauthStates).where(eq(oauthStates.state, state));
  if (Date.now() - new Date(row.createdAt).getTime() > STATE_TTL_MS) return null;
  return row.userId;
}

export async function saveRefreshToken(userId: string, refreshToken: string, channel: { name?: string; id?: string } = {}) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(userId) },
    await encryptionKey(),
    new TextEncoder().encode(refreshToken),
  );
  const row = {
    userId,
    refreshTokenEncrypted: toBase64(cipher),
    iv: toBase64(iv.buffer as ArrayBuffer),
    channelName: channel.name ?? null,
    channelId: channel.id ?? null,
    updatedAt: new Date().toISOString(),
  };
  await (await getDb()).insert(youtubeAuth).values(row).onConflictDoUpdate({
    target: youtubeAuth.userId,
    set: { refreshTokenEncrypted: row.refreshTokenEncrypted, iv: row.iv, channelName: row.channelName, channelId: row.channelId, updatedAt: row.updatedAt },
  });
}

export async function youtubeStatus(userId: string) {
  try {
    const [row] = await (await getDb()).select().from(youtubeAuth).where(eq(youtubeAuth.userId, userId)).limit(1);
    return row
      ? { connected: true, channelName: row.channelName, updatedAt: row.updatedAt }
      : { connected: false, channelName: null, updatedAt: null };
  } catch {
    return { connected: false, channelName: null, updatedAt: null };
  }
}

/**
 * Reads the stored refresh token, or null if there is none or it cannot be decrypted.
 * Separated out because both refreshing and revoking need it, and neither may leak it.
 */
async function storedRefreshToken(userId: string) {
  const [row] = await (await getDb()).select().from(youtubeAuth).where(eq(youtubeAuth.userId, userId)).limit(1);
  if (!row) return null;
  try {
    const clear = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(row.iv), additionalData: additionalData(userId) },
      await encryptionKey(),
      fromBase64(row.refreshTokenEncrypted),
    );
    return new TextDecoder().decode(clear);
  } catch {
    return null;
  }
}

/**
 * Disconnecting used to delete the local row and stop there, which leaves the grant
 * standing in the user's Google account: the app disappears from our side and remains in
 * theirs. Google's user-data policy expects the authorisation to be given back, so the
 * token is revoked first.
 *
 * The local purge happens whatever Google answers. A network failure at Google must not
 * leave a user unable to disconnect, so the revocation outcome is reported rather than
 * thrown — and the token never appears in that report.
 * https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
 */
export async function disconnectYoutube(userId: string): Promise<{ revoked: "revoked" | "not_connected" | "remote_failed" }> {
  let revoked: "revoked" | "not_connected" | "remote_failed" = "not_connected";
  const refreshToken = await storedRefreshToken(userId);
  if (refreshToken) {
    try {
      const response = await fetchUpstream("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken }).toString(),
        timeoutMs: 15_000,
      });
      // Google answers 400 for a token that is already invalid, which is success for us.
      revoked = response.ok || response.status === 400 ? "revoked" : "remote_failed";
    } catch {
      revoked = "remote_failed";
    }
  }
  await (await getDb()).delete(youtubeAuth).where(eq(youtubeAuth.userId, userId));
  return { revoked };
}

/**
 * A refresh token that Google reports as invalid_grant will never work again — the user
 * revoked it, changed their password, or it expired. Keeping the row means every later
 * call fails the same way while the interface still claims to be connected, so the
 * connection is dropped and a reconnection is asked for.
 */
async function forgetInvalidGrant(userId: string) {
  await (await getDb()).delete(youtubeAuth).where(eq(youtubeAuth.userId, userId));
}

/** A fresh access token for this user. Access tokens are never stored. */
export async function getAccessToken(userId: string) {
  const refreshToken = await storedRefreshToken(userId);
  if (!refreshToken) throw new YoutubeNotConnectedError();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("google_client_not_configured");
  const response = await fetchUpstream("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }).toString(),
    timeoutMs: 20_000,
  });
  const data = await response.json() as { access_token?: string; error?: string };
  // invalid_grant is terminal, not transient: the stored token is dead and every later
  // call would fail identically while the interface still showed "connected".
  if (data.error === "invalid_grant") {
    await forgetInvalidGrant(userId);
    throw new YoutubeNotConnectedError();
  }
  if (!response.ok || !data.access_token) throw new YoutubeNotConnectedError();
  return data.access_token;
}

export async function exchangeCode(code: string, request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("google_client_not_configured");
  const response = await fetchUpstream("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret, code,
      grant_type: "authorization_code",
      redirect_uri: `${publicOrigin(request)}/api/youtube/callback`,
    }).toString(),
    timeoutMs: 20_000,
  });
  const data = await response.json() as { refresh_token?: string; error?: string };
  if (!response.ok || !data.refresh_token) return null;
  return data.refresh_token;
}
