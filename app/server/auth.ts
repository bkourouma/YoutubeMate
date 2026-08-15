/**
 * Where an identity is allowed to come from.
 *
 * Until now the app read `oai-authenticated-user-id` unconditionally. Behind the current
 * OpenAI hosting that header is set by the platform and cannot be forged by a visitor —
 * but the same code deployed anywhere else would accept the header from anyone, and
 * encrypted API keys hang off that id. So the source of identity is now an explicit
 * choice rather than an implicit property of wherever the app happens to run.
 *
 * Adding a hosted provider later means adding a case here, not editing every route.
 */
export type AuthMode = "trusted-proxy-header" | "dev" | "hosted-session";

export const AUTH_MODES: AuthMode[] = ["trusted-proxy-header", "dev", "hosted-session"];

/** The header the current hosting sets once it has authenticated the visitor. */
export const TRUSTED_PROXY_HEADER = "oai-authenticated-user-id";

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Defaults to the contract the app is deployed under today, so this refactor cannot
 * take the running deployment down. Anything else has to be asked for by name.
 */
export function resolveAuthMode(): AuthMode {
  const configured = (process.env.AUTH_MODE ?? "").trim() as AuthMode;
  if (AUTH_MODES.includes(configured)) return configured;
  return "trusted-proxy-header";
}

export type AuthProvider = {
  mode: AuthMode;
  /** The authenticated user, or null. Must never invent one. */
  identify(headers: { get(name: string): string | null }): string | null;
};

const trustedProxyProvider: AuthProvider = {
  mode: "trusted-proxy-header",
  // The header first; DEV_USER_ID only as a fallback, and `devUserId` returns null in
  // production. Without that fallback there is no identity at all on a developer's
  // machine — nothing sets the header locally — and every route answers 401.
  identify: headers => headers.get(TRUSTED_PROXY_HEADER) || devUserId(),
};

const devProvider: AuthProvider = {
  mode: "dev",
  // The header is deliberately ignored here: in dev mode it is attacker-controlled, and
  // a local run that honoured it would behave differently from the deployment it models.
  identify: () => devUserId(),
};

const hostedSessionProvider: AuthProvider = {
  mode: "hosted-session",
  // No provider has been chosen yet — see docs/HOSTED_READINESS.md. Failing closed is
  // the only safe placeholder: returning an id here would hand out someone's keys.
  identify: () => null,
};

export function providerFor(mode: AuthMode): AuthProvider {
  if (mode === "dev") return devProvider;
  if (mode === "hosted-session") return hostedSessionProvider;
  return trustedProxyProvider;
}

/**
 * DEV_USER_ID stands in for the whole authentication layer, so in production it would
 * hand every anonymous visitor the same identity — and that identity's stored API keys.
 * A comment used to be the only thing preventing that.
 */
export function devUserId(): string | null {
  const configured = (process.env.DEV_USER_ID ?? "").trim();
  if (!configured) return null;
  if (isProduction()) return null;
  return configured;
}

/** True when DEV_USER_ID is set but refused, which is worth surfacing in diagnostics. */
export function devUserIdRefused() {
  return Boolean((process.env.DEV_USER_ID ?? "").trim()) && isProduction();
}
