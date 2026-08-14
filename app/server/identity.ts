import { headers } from "next/headers";

const USER_ID_HEADER = "oai-authenticated-user-id";

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
 * The signed-in ChatGPT user, or null. Never invents an identity: DEV_USER_ID is
 * the only way to get one without the header, and it must stay unset in production —
 * encrypted API keys hang off this id, so a shared fallback would let an anonymous
 * caller spend whoever last used that fallback's credits.
 */
export async function optionalUserId(): Promise<string | null> {
  const requestHeaders = await headers();
  return requestHeaders.get(USER_ID_HEADER) ?? process.env.DEV_USER_ID ?? null;
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
