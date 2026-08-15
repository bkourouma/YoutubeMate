import { headers } from "next/headers";
import { providerFor, resolveAuthMode, TRUSTED_PROXY_HEADER } from "./auth";

export { TRUSTED_PROXY_HEADER };

export class UnauthorizedError extends Error {
  constructor(readonly code: "authentication_required" | "user_not_allowed") {
    super(code);
    this.name = "UnauthorizedError";
  }
}

function allowList() {
  return (process.env.ALLOWED_USER_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean);
}

/**
 * The signed-in user, or null. Never invents an identity.
 *
 * The source is decided by AUTH_MODE rather than by whatever header happens to arrive:
 * outside the trusted-proxy mode, `oai-authenticated-user-id` is ignored, because
 * anywhere but behind the hosting that sets it, it is attacker-controlled — and
 * encrypted API keys hang off this id.
 */
export async function optionalUserId(): Promise<string | null> {
  const requestHeaders = await headers();
  const mode = resolveAuthMode();
  const userId = providerFor(mode).identify(requestHeaders);
  return userId && userId.trim() ? userId.trim() : null;
}

export async function requireUserId(): Promise<string> {
  const userId = await optionalUserId();
  if (!userId) throw new UnauthorizedError("authentication_required");
  const allowed = allowList();
  if (allowed.length && !allowed.includes(userId)) throw new UnauthorizedError("user_not_allowed");
  return userId;
}

export function isAdminUser(userId: string) {
  const admin = (process.env.ADMIN_USER_ID ?? "").trim();
  return Boolean(admin) && admin === userId;
}

export function unauthorizedResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: error.code }, { status: error.code === "user_not_allowed" ? 403 : 401 });
  }
  return null;
}

/** Turns an UnauthorizedError thrown anywhere in a handler into a 401/403 JSON body. */
export async function withUser<T>(handler: (userId: string) => Promise<T>): Promise<T | Response> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: error.code }, { status: error.code === "user_not_allowed" ? 403 : 401 });
    }
    throw error;
  }
  return handler(userId);
}
