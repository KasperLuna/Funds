import type { RowRecord, QueryParams } from "./types.js";

/**
 * Column-type knowledge shared by every SyncDatabase backend.
 *
 * The server schema stores money as bigint minor units, timestamps as
 * timestamptz, and lists/objects as jsonb. PowerSync streams those values down
 * as JSON and SQLite stores what the client schema declares. To keep every
 * backend reading and writing the same shape:
 *   - jsonb columns arrive/stored as JSON strings; normalize to arrays/objects
 *     on read and stringify on write.
 *   - timestamp columns arrive as ISO strings or epoch numbers; normalize to
 *     epoch ms on read and write numbers.
 *   - PowerSync returns NULL columns as `""` for integer/boolean/jsonb columns;
 *     normalize those back to null on read.
 *
 * Keep this list in sync with packages/db/src/schema.ts.
 */

const JSONB_COLUMNS: Record<string, string[]> = {
  accounts: ["colors"],
  categories: [],
  transactions: ["category_ids"],
  transfers: [],
  trades: [],
  templates: ["category_ids"],
  scheduled_transactions: ["category_ids", "recurrence"],
  push_subscriptions: ["keys"],
};

const TIMESTAMP_COLUMNS: Record<string, string[]> = {
  accounts: ["created_at", "updated_at", "deleted_at"],
  categories: ["created_at", "updated_at", "deleted_at"],
  category_budgets: ["created_at", "updated_at", "deleted_at", "month_start"],
  transactions: ["created_at", "updated_at", "deleted_at", "date"],
  transfers: ["created_at", "updated_at", "deleted_at"],
  trades: ["created_at", "updated_at", "deleted_at"],
  tokens: ["created_at", "updated_at", "deleted_at"],
  token_transactions: ["created_at", "updated_at", "deleted_at", "timestamp"],
  templates: ["created_at", "updated_at", "deleted_at"],
  scheduled_transactions: [
    "created_at",
    "updated_at",
    "deleted_at",
    "invoke_date",
    "previous_date",
    "last_notified_at",
  ],
  push_subscriptions: ["created_at", "updated_at", "deleted_at"],
};

/** Non-text columns that PowerSync may return as "" when NULL. */
const NON_TEXT_COLUMNS: Record<string, string[]> = {
  accounts: ["archived", "colors"],
  categories: ["hideable", "monthly_budget_minor"],
  category_budgets: ["amount_minor"],
  transactions: ["amount_minor", "category_ids", "value_base_minor"],
  transfers: [],
  trades: [],
  tokens: [],
  token_transactions: ["amount_minor", "price_at_execution_minor", "fee_minor"],
  templates: ["amount_minor", "category_ids"],
  scheduled_transactions: ["amount_minor", "category_ids", "recurrence", "active"],
  push_subscriptions: ["keys"],
};

export function jsonbColumns(table: string): string[] {
  return JSONB_COLUMNS[table] ?? [];
}

export function timestampColumns(table: string): string[] {
  return TIMESTAMP_COLUMNS[table] ?? [];
}

function toEpochMs(anyValue: unknown): unknown {
  if (anyValue == null) return null;
  if (typeof anyValue === "number") return anyValue;
  if (anyValue instanceof Date) return anyValue.getTime();
  if (typeof anyValue === "string") {
    // timestamp coercion, not money arithmetic
    const num = Number(anyValue);
    if (Number.isFinite(num)) return num;
    const t = Date.parse(anyValue);
    return Number.isFinite(t) ? t : anyValue;
  }
  return anyValue;
}

function parseJson(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  // PowerSync stores NULL jsonb columns as ""; treat as null so Postgres jsonb
  // does not reject the empty string on upload.
  if (value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Normalize a row read from any backend into the app's expected shape. */
export function normalizeRow(table: string, row: RowRecord): RowRecord {
  const out: RowRecord = { ...row };
  for (const col of jsonbColumns(table)) {
    if (col in out) out[col] = parseJson(out[col]);
  }
  for (const col of timestampColumns(table)) {
    if (col in out) out[col] = toEpochMs(out[col]);
  }
  for (const col of NON_TEXT_COLUMNS[table] ?? []) {
    if (out[col] === "") out[col] = null;
  }
  return out;
}

export function normalizeRows(table: string, rows: RowRecord[]): RowRecord[] {
  return rows.map((r) => normalizeRow(table, r));
}

/** Encode a row before writing so SQLite/views store the right shape. */
export function denormalizeRow(table: string, row: RowRecord): RowRecord {
  const out: RowRecord = { ...row };
  for (const col of jsonbColumns(table)) {
    if (col in out && out[col] != null && typeof out[col] !== "string") {
      out[col] = JSON.stringify(out[col]);
    }
  }
  for (const col of timestampColumns(table)) {
    if (col in out && out[col] != null && typeof out[col] !== "number") {
      const ms = toEpochMs(out[col]);
      if (typeof ms === "number") out[col] = ms;
    }
  }
  return out;
}

/**
 * PowerSync-safe upsert against a synced view.
 *
 * PowerSync exposes synced tables as SQLite views; `INSERT ... ON CONFLICT`
 * (UPSERT) is illegal on views. Replace it with a check-then-write so the same
 * facade works on PowerSync and the in-memory backend.
 */
export async function upsertRow(
  execute: (sql: string, params?: QueryParams) => Promise<unknown>,
  query: (sql: string, params?: QueryParams) => Promise<{ rows: RowRecord[] }>,
  table: string,
  row: RowRecord,
): Promise<void> {
  const id = String(row.id);
  const data = denormalizeRow(table, row);
  const existing = await query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  if (existing.rows.length > 0) {
    const cols = Object.keys(data).filter((c) => c !== "id");
    const set = cols.map((c) => `${c} = ?`).join(", ");
    const params = [...cols.map((c) => data[c]), id];
    await execute(`UPDATE ${table} SET ${set} WHERE id = ?`, params);
  } else {
    const cols = Object.keys(data);
    const placeholders = cols.map(() => "?").join(", ");
    const params = cols.map((c) => data[c]);
    await execute(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      params,
    );
  }
}
