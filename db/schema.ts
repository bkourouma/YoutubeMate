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
