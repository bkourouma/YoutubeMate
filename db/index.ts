import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// `cloudflare:workers` is resolved lazily so importing this module never drags a
// workerd-only specifier into a route's static graph — routes that merely *might*
// touch the database stay loadable outside workerd (the SSR test harness, tooling).
export async function getDb() {
  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as unknown as { DB?: D1Database };
  if (!runtimeEnv.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(runtimeEnv.DB, { schema });
}
