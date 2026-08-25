/**
 * Schema drift check: verifies the live database matches the drizzle schema in
 * schema.ts. Fails loudly (exit 1) when any table or column is missing, so a
 * migration that was generated but never applied (e.g. out-of-band DBs with no
 * drizzle tracking) is caught by CI / pre-commit instead of breaking prod.
 *
 * Derives the expected shape from schema.ts at runtime (each column exposes its
 * DB name + table), so adding a table/column to schema.ts automatically updates
 * this check — no separate list to keep in sync.
 */
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:54329/funds_test";

const COLS = Symbol.for("drizzle:Columns");
const NAME = Symbol.for("drizzle:Name");

type AnyTable = Record<string, unknown> & {
  [COLS]: Record<string, { name: string; table: { [NAME]: string } }>;
};

async function main() {
  const pool = new Pool({ connectionString });
  try {
    const expected = new Map<string, Set<string>>();
    for (const maybeTable of Object.values(schema)) {
      const table = maybeTable as unknown as AnyTable;
      if (!table[COLS]) continue; // non-table exports (enums etc.)
      const tableName = Object.values(table[COLS])[0]?.table?.[NAME];
      if (!tableName) continue;
      const set = expected.get(tableName) ?? new Set<string>();
      for (const col of Object.values(table[COLS])) set.add(col.name);
      expected.set(tableName, set);
    }

    const errors: string[] = [];
    for (const [table, columns] of expected) {
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      const present = new Set(rows.map((r) => r.column_name));
      if (rows.length === 0) {
        errors.push(`table "public.${table}" is MISSING — a migration was never applied`);
        continue;
      }
      for (const col of columns) {
        if (!present.has(col)) {
          errors.push(`column "public.${table}.${col}" is MISSING — a migration was never applied`);
        }
      }
    }

    if (errors.length > 0) {
      console.error(`Schema drift detected (${errors.length}):`);
      for (const e of errors) console.error(`  - ${e}`);
      console.error("Run `pnpm --filter @funds/db run migrate` against this DB.");
      process.exit(1);
    }
    console.log(`Schema check passed: ${expected.size} tables match schema.ts.`);
  } finally {
    await pool.end();
  }
}

void main();