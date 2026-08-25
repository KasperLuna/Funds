import { pgTable, text, bigint, integer, boolean, jsonb, timestamp, unique, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { newId } from "./id.js";

// Enums
export const assetKindEnum = pgEnum("asset_kind", ["fiat", "crypto"]);
export const accountKindEnum = pgEnum("account_kind", ["bank", "cash", "wallet", "exchange"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);

// Assets
export const assets = pgTable("assets", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  kind: assetKindEnum("kind").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  coingeckoId: text("coingecko_id"),
  decimals: integer("decimals").notNull(),
}, (table) => ({
  codeIdx: unique("assets_code_unique").on(table.code),
}));

// Users (Better Auth compatible)
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  image: text("image"),
  username: text("username").notNull(),
  baseAssetId: text("base_asset_id").references(() => assets.id),
  timezone: text("timezone"),
  voiceApiKeyHash: text("voice_api_key_hash"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  emailIdx: unique("users_email_unique").on(table.email),
}));

// Better Auth core tables (prefixed exports to avoid collision with bank accounts; singular SQL table names per Better Auth)
export const authSessions = pgTable("session", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  token: text("token").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  tokenIdx: unique("sessions_token_unique").on(table.token),
}));

export const authAccounts = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  userId: text("user_id").notNull().references(() => users.id),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  issuer: text("issuer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const authVerifications = pgTable("verification", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Accounts
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  kind: accountKindEnum("kind").notNull(),
  assetId: text("asset_id").notNull().references(() => assets.id),
  openingBalanceMinor: bigint("opening_balance_minor", { mode: "bigint" }).notNull().default(sql`0`),
  colors: jsonb("colors").$type<{ primary_color?: string; secondary_color?: string } | null>(),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Categories
export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  color: text("color"),
  hideable: boolean("hideable").notNull().default(false),
  monthlyBudgetMinor: bigint("monthly_budget_minor", { mode: "bigint" }),
  // Currency the budget is denominated in (display + spent aggregation).
  assetId: text("asset_id").references(() => assets.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Per-month budget history (auditable): editing a budget now only touches the
// current period; past months keep their own recorded value.
export const categoryBudgets = pgTable("category_budgets", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  categoryId: text("category_id").notNull().references(() => categories.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  monthStart: timestamp("month_start", { withTimezone: true }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  monthIdx: unique("category_budgets_category_month_unique").on(table.categoryId, table.monthStart),
}));

// Transfers
export const transfers = pgTable("transfers", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  feeTransactionId: text("fee_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Trades
export const trades = pgTable("trades", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  sellLegId: text("sell_leg_id").notNull(),
  buyLegId: text("buy_leg_id").notNull(),
  feeLegId: text("fee_leg_id"),
  rate: text("rate"), // cavetail: string to avoid float
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Tokens (per-user crypto holdings metadata)
export const tokens = pgTable("tokens", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  coingeckoId: text("coingecko_id"),
  decimals: integer("decimals").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Token Transactions (crypto trade ledger)
export const tokenTransactions = pgTable("token_transactions", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  tokenId: text("token_id").notNull().references(() => tokens.id),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  priceAtExecutionMinor: bigint("price_at_execution_minor", { mode: "bigint" }).notNull(),
  feeMinor: bigint("fee_minor", { mode: "bigint" }).notNull().default(sql`0`),
  side: text("side").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  accountId: text("account_id").notNull().references(() => accounts.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(), // SIGNED: expense<0, income>0
  type: transactionTypeEnum("type").notNull(),
  description: text("description").notNull().default(""),
  categoryIds: jsonb("category_ids").$type<string[]>().notNull().default(sql`'[]'`),
  date: timestamp("date", { withTimezone: true }).notNull(),
  valueBaseMinor: bigint("value_base_minor", { mode: "bigint" }),
  tradeId: text("trade_id"),
  transferId: text("transfer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Templates
export const templates = pgTable("templates", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  description: text("description").notNull().default(""),
  accountId: text("account_id").notNull().references(() => accounts.id),
  categoryIds: jsonb("category_ids").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Scheduled Transactions
export const scheduledTransactions = pgTable("scheduled_transactions", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  type: transactionTypeEnum("type").notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  accountId: text("account_id").notNull().references(() => accounts.id),
  categoryIds: jsonb("category_ids").$type<string[]>().notNull(),
  recurrence: jsonb("recurrence").$type<{
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
  } | null>(),
  timezone: text("timezone"), // IANA
  invokeDate: timestamp("invoke_date", { withTimezone: true }),
  previousDate: timestamp("previous_date", { withTimezone: true }),
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Push Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  keys: jsonb("keys").$type<{ p256dh: string; auth: string }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  endpointIdx: unique("push_subscriptions_endpoint_unique").on(table.endpoint),
}));

// Voice Drafts
export const voiceDrafts = pgTable("voice_drafts", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  preview: jsonb("preview").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
  tokenIdx: unique("voice_drafts_token_unique").on(table.token),
}));

// Rates
export const rates = pgTable("rates", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  assetId: text("asset_id").notNull().references(() => assets.id),
  vsAssetId: text("vs_asset_id").notNull().references(() => assets.id),
  priceMinorScaled: bigint("price_minor_scaled", { mode: "bigint" }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

// Rates History
export const ratesHistory = pgTable("rates_history", {
  id: text("id").primaryKey().$defaultFn(() => newId()),
  // cavetail: app layer generates ids via @funds/core ulid; local helper only for seed/tests
  assetId: text("asset_id").notNull().references(() => assets.id),
  vsAssetId: text("vs_asset_id").notNull().references(() => assets.id),
  priceMinorScaled: bigint("price_minor_scaled", { mode: "bigint" }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});
