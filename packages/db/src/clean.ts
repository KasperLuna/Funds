/**
 * Wipe all app data from Postgres.
 *
 * Uses DELETE (not TRUNCATE) because PowerSync replicates DELETEs to clients
 * via logical replication; TRUNCATE is not captured and would leave clients
 * with stale local rows. The `drizzle` migration table and the `powersync`
 * internal schema are left untouched.
 *
 * Usage:
 *   DATABASE_URL=postgres://... tsx src/clean.ts          # wipe all data
 *   DATABASE_URL=postgres://... tsx src/clean.ts --seed   # wipe, then seed demo
 */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/funds";
const SEED = process.argv.includes("--seed");

// Child tables first (FK order), auth before users.
const TABLES = [
  "session",
  "account",
  "verification",
  "transactions",
  "transfers",
  "trades",
  "token_transactions",
  "tokens",
  "templates",
  "scheduled_transactions",
  "category_budgets",
  "push_subscriptions",
  "voice_drafts",
  "categories",
  "accounts",
  "rates_history",
  "rates",
  "users",
  "assets",
];

const pool = new Pool({ connectionString: DATABASE_URL });

console.log(`Cleaning ${TABLES.length} tables...`);
await pool.query("BEGIN");
for (const table of TABLES) {
  const res = await pool.query(`DELETE FROM ${table}`);
  console.log(`  ${table}: ${res.rowCount} rows deleted`);
}
await pool.query("COMMIT");

if (SEED) {
  const { seed } = await import("./seed.js");
  await seed(drizzle(pool));
  console.log("Seed completed.");
}

await pool.end();
console.log("Done.");
process.exit(0);
