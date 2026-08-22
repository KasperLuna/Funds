import { column, Schema, Table } from "@powersync/web";

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
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const templates = new Table({
  id: column.text,
  user_id: column.text,
  created_at: column.integer,
  updated_at: column.integer,
  deleted_at: column.integer,
});

const scheduled_transactions = new Table({
  id: column.text,
  user_id: column.text,
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
  transactions,
  transfers,
  trades,
  templates,
  scheduled_transactions,
  push_subscriptions,
});

export type AppSchema = typeof appSchema;
