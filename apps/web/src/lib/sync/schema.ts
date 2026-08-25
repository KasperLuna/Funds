import { column, Schema, Table } from "@powersync/web";

/**
 * Client-side schema for PowerSync. Column names/types must match the server
 * schema (packages/db/src/schema.ts) so streams replicate cleanly. jsonb
 * columns are declared `text` (JSON encoded) and normalized in normalize.ts.
 */

/**
 * Client-side schema for PowerSync. Column names/types must match the server
 * schema (packages/db/src/schema.ts) so streams replicate cleanly. jsonb
 * columns are declared `text` (JSON encoded) and normalized in normalize.ts.
 *
 * Timestamp columns are declared `text` (NOT integer): PowerSync streams
 * timestamptz as ISO 8601 strings, and `column.integer` coerces those with
 * parseInt (e.g. "2026-08-20T00:00:00Z" → 2026, the year). `text` preserves
 * the string so normalize.ts can convert to epoch ms on read.
 */

const accounts = new Table({
  user_id: column.text,
  name: column.text,
  kind: column.text,
  asset_id: column.text,
  opening_balance_minor: column.integer,
  colors: column.text,
  archived: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const categories = new Table({
  user_id: column.text,
  name: column.text,
  color: column.text,
  hideable: column.integer,
  monthly_budget_minor: column.integer,
  asset_id: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const category_budgets = new Table({
  user_id: column.text,
  category_id: column.text,
  asset_id: column.text,
  month_start: column.text,
  amount_minor: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const transactions = new Table({
  user_id: column.text,
  account_id: column.text,
  asset_id: column.text,
  amount_minor: column.integer,
  type: column.text,
  description: column.text,
  category_ids: column.text,
  date: column.text,
  value_base_minor: column.integer,
  trade_id: column.text,
  transfer_id: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const transfers = new Table({
  user_id: column.text,
  fee_transaction_id: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const trades = new Table({
  user_id: column.text,
  sell_leg_id: column.text,
  buy_leg_id: column.text,
  fee_leg_id: column.text,
  rate: column.text,
  note: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const tokens = new Table({
  user_id: column.text,
  symbol: column.text,
  name: column.text,
  coingecko_id: column.text,
  decimals: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const token_transactions = new Table({
  user_id: column.text,
  token_id: column.text,
  amount_minor: column.integer,
  price_at_execution_minor: column.integer,
  fee_minor: column.integer,
  side: column.text,
  timestamp: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const templates = new Table({
  user_id: column.text,
  name: column.text,
  type: column.text,
  amount_minor: column.integer,
  description: column.text,
  account_id: column.text,
  category_ids: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const scheduled_transactions = new Table({
  user_id: column.text,
  name: column.text,
  description: column.text,
  type: column.text,
  amount_minor: column.integer,
  account_id: column.text,
  category_ids: column.text,
  recurrence: column.text,
  timezone: column.text,
  invoke_date: column.text,
  previous_date: column.text,
  last_notified_at: column.text,
  active: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const push_subscriptions = new Table({
  user_id: column.text,
  endpoint: column.text,
  keys: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

export const appSchema = new Schema({
  accounts,
  categories,
  category_budgets,
  transactions,
  transfers,
  trades,
  tokens,
  token_transactions,
  templates,
  scheduled_transactions,
  push_subscriptions,
});

export type AppSchema = typeof appSchema;
