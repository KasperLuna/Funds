/**
 * Table registry: maps replicated table names to drizzle tables + field name translation
 * Wire format (PowerSync/mutations) uses snake_case; drizzle uses camelCase
 */
import * as schema from "@funds/db/schema";
import type { AnyPgTable, AnyPgColumn } from "drizzle-orm/pg-core";

type FieldMapper = Record<string, string>;

// All replicated tables carry an `id` text PK (ULID)
type IdTable = AnyPgTable & { id: AnyPgColumn };

export type TableConfig = {
  table: IdTable;
  snakeToCamel: FieldMapper;
  camelToSnake: FieldMapper;
};

// Helper to build inverse mapper
function inverse(map: FieldMapper): FieldMapper {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
}

// Accounts
const accountsSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  name: "name",
  kind: "kind",
  asset_id: "assetId",
  opening_balance_minor: "openingBalanceMinor",
  colors: "colors",
  archived: "archived",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

// Categories
const categoriesSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  name: "name",
  hideable: "hideable",
  monthly_budget_minor: "monthlyBudgetMinor",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

// Transactions
const transactionsSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  account_id: "accountId",
  asset_id: "assetId",
  amount_minor: "amountMinor",
  type: "type",
  description: "description",
  category_ids: "categoryIds",
  date: "date",
  value_base_minor: "valueBaseMinor",
  trade_id: "tradeId",
  transfer_id: "transferId",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

// Transfers
const transfersSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  fee_transaction_id: "feeTransactionId",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

// Trades
const tradesSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  sell_leg_id: "sellLegId",
  buy_leg_id: "buyLegId",
  fee_leg_id: "feeLegId",
  rate: "rate",
  note: "note",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

// Templates
const templatesSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  name: "name",
  type: "type",
  amount_minor: "amountMinor",
  description: "description",
  account_id: "accountId",
  category_ids: "categoryIds",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

// Scheduled Transactions
const scheduledTransactionsSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  name: "name",
  description: "description",
  type: "type",
  amount_minor: "amountMinor",
  account_id: "accountId",
  category_ids: "categoryIds",
  recurrence: "recurrence",
  timezone: "timezone",
  invoke_date: "invokeDate",
  previous_date: "previousDate",
  last_notified_at: "lastNotifiedAt",
  active: "active",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

// Push Subscriptions
const pushSubscriptionsSnakeToCamel: FieldMapper = {
  id: "id",
  user_id: "userId",
  endpoint: "endpoint",
  keys: "keys",
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
};

/**
 * Table registry: maps table name to drizzle table + field mappers
 */
export const TABLE_REGISTRY: Record<string, TableConfig> = {
  accounts: {
    table: schema.accounts,
    snakeToCamel: accountsSnakeToCamel,
    camelToSnake: inverse(accountsSnakeToCamel),
  },
  categories: {
    table: schema.categories,
    snakeToCamel: categoriesSnakeToCamel,
    camelToSnake: inverse(categoriesSnakeToCamel),
  },
  transactions: {
    table: schema.transactions,
    snakeToCamel: transactionsSnakeToCamel,
    camelToSnake: inverse(transactionsSnakeToCamel),
  },
  transfers: {
    table: schema.transfers,
    snakeToCamel: transfersSnakeToCamel,
    camelToSnake: inverse(transfersSnakeToCamel),
  },
  trades: {
    table: schema.trades,
    snakeToCamel: tradesSnakeToCamel,
    camelToSnake: inverse(tradesSnakeToCamel),
  },
  templates: {
    table: schema.templates,
    snakeToCamel: templatesSnakeToCamel,
    camelToSnake: inverse(templatesSnakeToCamel),
  },
  scheduled_transactions: {
    table: schema.scheduledTransactions,
    snakeToCamel: scheduledTransactionsSnakeToCamel,
    camelToSnake: inverse(scheduledTransactionsSnakeToCamel),
  },
  push_subscriptions: {
    table: schema.pushSubscriptions,
    snakeToCamel: pushSubscriptionsSnakeToCamel,
    camelToSnake: inverse(pushSubscriptionsSnakeToCamel),
  },
};
