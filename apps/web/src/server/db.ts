import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@funds/db/schema";

const { Pool } = pg;

const TEST_URL = "postgres://postgres:postgres@localhost:54329/funds_test";
const DEV_URL = "postgres://postgres:postgres@localhost:5432/funds";

let pool: pg.Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (!db) {
    // cavetail: VITEST-gated test default; prod must supply DATABASE_URL (compose/.env)
    const connectionString =
      process.env.DATABASE_URL ??
      (process.env.VITEST ? TEST_URL : DEV_URL);
    
    pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function cleanDbForTests() {
  const database = getDb();
  
  // Delete in FK-safe order
  await database.delete(schema.authSessions);
  await database.delete(schema.authVerifications);
  await database.delete(schema.authAccounts);
  await database.delete(schema.users);
  await database.delete(schema.assets);
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}
