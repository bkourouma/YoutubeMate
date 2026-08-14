import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  payload: text("payload").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// One encrypted row per user per provider. `last4` lets the settings screen show
// something meaningful without ever decrypting.
export const integrationSettings = sqliteTable("integration_settings", {
  userId: text("user_id").notNull(),
  service: text("service").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  iv: text("iv").notNull(),
  last4: text("last4"),
  updatedAt: text("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.service] })]);

// AI results keyed by a hash that includes the owner: without user_id in the key, two
// users pasting the same transcript would share a cache entry across tenants.
export const aiCache = sqliteTable("ai_cache", {
  key: text("key").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_ai_cache_user_created").on(table.userId, table.createdAt)]);

// One-hour idempotency ledger for Descript agent jobs. Scoped by user: without that,
// an identical request from another account returned someone else's job_id to poll.
export const descriptJobs = sqliteTable("descript_jobs", {
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  projectId: text("project_id").notNull(),
  jobId: text("job_id").notNull(),
  jobState: text("job_state").notNull(),
  model: text("model"),
  usagePayload: text("usage_payload"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.key] })]);

// One YouTube connection per user, refresh token encrypted like every other secret.
// The original stored a single global row (id = 1) in plaintext, so any visitor who
// completed the OAuth flow repointed everyone's uploads at their own channel.
export const youtubeAuth = sqliteTable("youtube_auth", {
  userId: text("user_id").primaryKey(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  iv: text("iv").notNull(),
  channelName: text("channel_name"),
  channelId: text("channel_id"),
  updatedAt: text("updated_at").notNull(),
});

// Single-use OAuth state bound to the user who started the flow. Replaces a substring
// test on the raw Cookie header, which any cookie containing the state value satisfied.
export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  createdAt: text("created_at").notNull(),
});

// One row per Shorts project. Kept out of the workspaces blob on purpose: a single
// Shorts state (transcript + up to 50 excerpts + titles + metadata) can exceed the
// 900 KB cap that guards the whole workspace, which is rewritten on every keystroke.
export const shortsProjects = sqliteTable("shorts_projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  stage: integer("stage").notNull().default(1),
  statePayload: text("state_payload").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [index("idx_shorts_projects_user_updated").on(table.userId, table.updatedAt)]);
