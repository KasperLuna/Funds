import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// cavetail: drizzle-kit 0.31 migrate exits 1 on no-op re-runs; use programmatic
// migrator (idempotent, same path the test suite uses).
const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:54329/funds_test";

const pool = new Pool({ connectionString });
const db = drizzle(pool);

/**
 * Self-heal DBs created out-of-band (drizzle-kit push / legacy import): they
 * have the full schema but no `drizzle.__drizzle_migrations` tracking, so the
 * migrator would replay every migration and fail with "already exists". If the
 * tracking table is empty while the app schema already exists, mark all journal
 * migrations as applied so `migrate` below becomes a no-op and FUTURE
 * migrations apply cleanly.
 */
async function baselineIfUntracked() {
  const { rows } = await pool.query(
    `SELECT to_regclass('public.categories') AS has_schema`,
  );
  if (!rows[0]?.has_schema) return;
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
       id SERIAL PRIMARY KEY,
       hash text NOT NULL,
       created_at bigint
     )`,
  );
  const tracked = await pool.query(`SELECT count(*)::int AS n FROM "drizzle"."__drizzle_migrations"`);
  if (tracked.rows[0].n > 0) return;

  const journal = JSON.parse(
    readFileSync("./drizzle/meta/_journal.json", "utf8"),
  ) as { entries: Array<{ tag: string; when: number }> };
  const lastWhen = journal.entries.at(-1)?.when ?? Date.now();
  for (const entry of journal.entries) {
    const sql = readFileSync(`./drizzle/${entry.tag}.sql`, "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    await pool.query(
      `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
      [hash, lastWhen],
    );
  }
  console.log(`Baselined ${journal.entries.length} existing migrations.`);
}

await baselineIfUntracked();

console.log("Applying migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });

// cavetail: out-of-band DBs (drizzle-kit push / legacy import) get baselined as
// fully migrated even when a migration landed after the schema was created;
// reconcile the known gaps idempotently so those DBs stay in sync.
await pool.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "color" text`);

console.log("Migrations applied.");

await pool.end();
process.exit(0);