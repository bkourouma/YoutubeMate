/**
 * Applies drizzle/*.sql to the local Miniflare D1 file used by `vinext dev`.
 *
 * The deployed app gets its migrations from the hosting control plane, but the local
 * D1 starts empty — so without this every database-backed route answers 503 offline.
 * Idempotent: statements already applied are skipped.
 *
 *   node scripts/apply-local-migrations.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const stateDir = join(process.cwd(), ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const files = await readdir(stateDir).catch(() => []);
const databaseFile = files.find(name => name.endsWith(".sqlite") && name !== "metadata.sqlite");
if (!databaseFile) {
  console.error("Aucune base D1 locale trouvée. Lancez `npx vinext dev` une fois, puis relancez ce script.");
  process.exit(1);
}

const database = new DatabaseSync(join(stateDir, databaseFile));
const migrationsDir = join(process.cwd(), "drizzle");
const migrations = (await readdir(migrationsDir)).filter(name => name.endsWith(".sql")).sort();

let applied = 0;
let skipped = 0;
for (const migration of migrations) {
  const sql = await readFile(join(migrationsDir, migration), "utf8");
  for (const statement of sql.split("--> statement-breakpoint").map(part => part.trim()).filter(Boolean)) {
    try {
      database.exec(statement);
      applied += 1;
    } catch (error) {
      if (/already exists/i.test(error.message)) { skipped += 1; continue; }
      console.error(`${migration} : ${error.message}`);
      process.exit(1);
    }
  }
}

const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf%' ORDER BY name").all();
database.close();
console.log(`${applied} instruction(s) appliquée(s), ${skipped} déjà présente(s).`);
console.log(`Tables : ${tables.map(row => row.name).join(", ") || "aucune"}`);
