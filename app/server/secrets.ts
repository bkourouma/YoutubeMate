import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { integrationSettings } from "../../db/schema";
import { isAdminUser, requireUserId, unauthorizedResponse } from "./identity";

export type IntegrationService = "openrouter" | "openai" | "descript";

export const INTEGRATION_SERVICES: IntegrationService[] = ["openrouter", "openai", "descript"];

export function isIntegrationService(value: unknown): value is IntegrationService {
  return typeof value === "string" && (INTEGRATION_SERVICES as string[]).includes(value);
}

export class IntegrationMissingError extends Error {
  constructor(readonly service: IntegrationService) {
    super("integration_not_configured");
    this.name = "IntegrationMissingError";
  }
}

async function encryptionKey() {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  // Fail loudly. Degrading to plaintext would silently break the promise made in the UI.
  if (!secret) throw new Error("settings_encryption_key_missing");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// Binding the owner and service into the AEAD means a ciphertext lifted from one row
// cannot be replayed into another user's row.
function additionalData(userId: string, service: IntegrationService) {
  return new TextEncoder().encode(`${userId}:${service}`);
}

function toBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function environmentValue(service: IntegrationService) {
  if (service === "descript") return process.env.DESCRIPT_API_TOKEN?.trim() ?? "";
  if (service === "openai") return process.env.OPENAI_API_KEY?.trim() ?? "";
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

export function normalizeApiKey(value?: string) {
  return value?.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "") ?? "";
}

export async function saveIntegrationSecret(userId: string, service: IntegrationService, rawValue: string) {
  const value = normalizeApiKey(rawValue);
  if (!value) throw new Error("empty_secret");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(userId, service) },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  const row = {
    userId, service,
    encryptedValue: toBase64(cipher),
    iv: toBase64(iv.buffer as ArrayBuffer),
    last4: value.slice(-4),
    updatedAt: new Date().toISOString(),
  };
  await (await getDb()).insert(integrationSettings).values(row).onConflictDoUpdate({
    target: [integrationSettings.userId, integrationSettings.service],
    set: { encryptedValue: row.encryptedValue, iv: row.iv, last4: row.last4, updatedAt: row.updatedAt },
  });
}

export async function deleteIntegrationSecret(userId: string, service: IntegrationService) {
  await (await getDb()).delete(integrationSettings)
    .where(and(eq(integrationSettings.userId, userId), eq(integrationSettings.service, service)));
}

/**
 * The stored key for this user. The environment fallback is admin-only on purpose:
 * an open fallback means anonymous callers spend the deployment's own credits.
 */
export async function getIntegrationSecret(service: IntegrationService, userId: string) {
  // A database hiccup must not lock the owner out of their own deployment, but it must
  // never hand anyone else a key either — hence the admin-only fallback below.
  let row: typeof integrationSettings.$inferSelect | undefined;
  try {
    [row] = await (await getDb()).select().from(integrationSettings)
      .where(and(eq(integrationSettings.userId, userId), eq(integrationSettings.service, service))).limit(1);
  } catch { row = undefined; }
  if (!row) {
    const fallback = isAdminUser(userId) ? environmentValue(service) : "";
    if (!fallback) throw new IntegrationMissingError(service);
    return fallback;
  }
  try {
    const clear = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(row.iv), additionalData: additionalData(userId, service) },
      await encryptionKey(),
      fromBase64(row.encryptedValue),
    );
    return new TextDecoder().decode(clear);
  } catch {
    throw new IntegrationMissingError(service);
  }
}

/** Status only — never decrypts, never returns key material. */
export async function integrationStatus(userId: string) {
  const rows = await (await getDb()).select().from(integrationSettings).where(eq(integrationSettings.userId, userId));
  const admin = isAdminUser(userId);
  return Object.fromEntries(INTEGRATION_SERVICES.map(service => {
    const row = rows.find(item => item.service === service);
    if (row) return [service, { configured: true, source: "user" as const, last4: row.last4 ?? "", updatedAt: row.updatedAt }];
    const fallback = admin && Boolean(environmentValue(service));
    return [service, { configured: fallback, source: fallback ? ("environment" as const) : ("none" as const), last4: "", updatedAt: null }];
  }));
}

/**
 * One-line guard for routes that spend money: resolves the caller and their key, or
 * returns the Response to send back. `const guard = await requireApiKey("openrouter");
 * if (guard instanceof Response) return guard;`
 */
export async function requireApiKey(service: IntegrationService) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "authentication_required" }, { status: 401 });
  }
  try {
    return { userId, apiKey: await getIntegrationSecret(service, userId) };
  } catch (error) {
    return integrationErrorResponse(error) ?? Response.json({ error: "integration_not_configured", service }, { status: 503 });
  }
}

/** 503 with a code the client maps to "configure your key in Settings". */
export function integrationErrorResponse(error: unknown) {
  if (error instanceof IntegrationMissingError) {
    return Response.json({ error: "integration_not_configured", service: error.service }, { status: 503 });
  }
  if (error instanceof Error && error.message === "settings_encryption_key_missing") {
    return Response.json({ error: "settings_storage_unavailable" }, { status: 503 });
  }
  return null;
}
