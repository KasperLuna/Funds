import { column, Schema, Table } from "@powersync/web";

/**
 * Client-side schema for PowerSync. Column names/types must match the server
 * schema (packages/db/src/schema.ts) so streams replicate cleanly. jsonb
 * columns are declared `text` (JSON encoded) and normalized in normalize.ts.
 */

const accounts = new Table({
  id: column.text,
  user_id: column.text,
  name: column.text,
  kind: column.text,
  asset_id: column.text,
  opening_balance_minor: column.integer,
  colors: column.text,
  archived: column.integer,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const categories = new Table({
  id: column.text,
  user_id: column.text,
  name: column.text,
  hideable: column.integer,
  monthly_budget_minor: column.integer,
  asset_id: column.text,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const category_budgets = new Table({
  id: column.text,
  user_id: column.text,
  category_id: column.text,
  asset_id: column.text,
  month_start: column.integer,
  amount_minor: column.integer,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const transactions = new Table({
  id: column.text,
  user_id: column.text,
  account_id: column.text,
  asset_id: column.text,
  amount_minor: column.integer,
  type: column.text,
  description: column.text,
  category_ids: column.text,
  date: column.integer,
  value_base_minor: column.integer,
  trade_id: column.text,
  transfer_id: column.text,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const transfers = new Table({
  id: column.text,
  user_id: column.text,
  fee_transaction_id: column.text,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const trades = new Table({
  id: column.text,
  user_id: column.text,
  sell_leg_id: column.text,
  buy_leg_id: column.text,
  fee_leg_id: column.text,
  rate: column.text,
  note: column.text,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const templates = new Table({
  id: column.text,
  user_id: column.text,
  name: column.text,
  type: column.text,
  amount_minor: column.integer,
  description: column.text,
  account_id: column.text,
  category_ids: column.text,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const scheduled_transactions = new Table({
  id: column.text,
  user_id: column.text,
  name: column.text,
  description: column.text,
  type: column.text,
  amount_minor: column.integer,
  account_id: column.text,
  category_ids: column.text,
  recurrence: column.text,
  timezone: column.text,
  invoke_date: column.integer,
  previous_date: column.integer,
  last_notified_at: column.integer,
  active: column.integer,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const push_subscriptions = new Table({
  id: column.text,
  user_id: column.text,
  endpoint: column.text,
  keys: column.text,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

export const appSchema = new Schema({
  accounts,
  categories,
  category_budgets,
  transactions,
  transfers,
  trades,
  templates,
  scheduled_transactions,
  push_subscriptions,
});

export type AppSchema = typeof appSchema;
