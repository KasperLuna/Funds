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

console.log("Applying migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");

await pool.end();
process.exit(0);