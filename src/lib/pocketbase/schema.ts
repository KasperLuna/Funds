/**
 * PocketBase collection schema definitions.
 *
 * ## Row-Level Security (RLS)
 *
 * Every user-owned collection enforces data isolation via PocketBase API rules.
 * These rules are applied server-side by PocketBase on every request:
 *
 * | Rule        | Expression                            | Purpose                                      |
 * |-------------|---------------------------------------|----------------------------------------------|
 * | listRule    | `user = @request.auth.id`             | Users can only list their own records         |
 * | viewRule    | `user = @request.auth.id`             | Users can only view their own records         |
 * | createRule  | `@request.data.user = @request.auth.id` | Users can only create records for themselves |
 * | updateRule  | `user = @request.auth.id`             | Users can only update their own records       |
 * | deleteRule  | `user = @request.auth.id`             | Users can only delete their own records       |
 *
 * The `userRLS` constant below is spread into every collection schema.
 * The schema-validator (`schema-validator.ts`) passes these rules to PocketBase
 * when creating collections via `validateAndCreateCollections()`.
 *
 * ### Client-side enforcement
 *
 * In addition to server-side RLS, every React Query hook in `src/lib/hooks/`
 * applies `filter: \`user = "\${userId}"\`` on read queries and sets
 * `user: userId` on create mutations as a defense-in-depth measure.
 *
 * ### Collections protected by RLS
 *
 * - **banks** — Bank accounts
 * - **categories** — Transaction categories
 * - **transactions** — Financial transactions
 * - **planned_transactions** — Recurring/scheduled transactions
 * - **tokens** — Cryptocurrency holdings
 * - **push_subscriptions** — Web Push notification endpoints
 */

export interface CollectionField {
  name: string;
  type: string;
  required?: boolean;
  options?: Record<string, unknown>;
}

export interface CollectionSchema {
  name: string;
  type: "base";
  fields: CollectionField[];
  listRule: string;
  viewRule: string;
  createRule: string;
  updateRule: string;
  deleteRule: string;
}

/**
 * Shared RLS rules scoped to the authenticated user.
 * Applied to every user-owned collection via object spread.
 *
 * @see https://pocketbase.io/docs/api-rules-and-filters/
 */
const userRLS = {
  listRule: "user = @request.auth.id",
  viewRule: "user = @request.auth.id",
  createRule: "@request.data.user = @request.auth.id",
  updateRule: "user = @request.auth.id",
  deleteRule: "user = @request.auth.id",
};

/** Banks collection — RLS: all operations scoped to `user = @request.auth.id` */
export const banksCollection: CollectionSchema = {
  name: "banks",
  type: "base",
  ...userRLS,
  fields: [
    {
      name: "user",
      type: "relation",
      required: true,
      options: { collectionId: "_pb_users_auth_", maxSelect: 1 },
    },
    { name: "name", type: "text", required: true },
    { name: "balance", type: "number", required: true, options: { min: null, max: null } },
    { name: "primaryColor", type: "text" },
    { name: "secondaryColor", type: "text" },
  ],
};

/** Categories collection — RLS: all operations scoped to `user = @request.auth.id` */
export const categoriesCollection: CollectionSchema = {
  name: "categories",
  type: "base",
  ...userRLS,
  fields: [
    {
      name: "user",
      type: "relation",
      required: true,
      options: { collectionId: "_pb_users_auth_", maxSelect: 1 },
    },
    { name: "name", type: "text", required: true },
    { name: "hideable", type: "bool", required: true },
    { name: "total_exempt", type: "bool" },
    { name: "monthly_budget", type: "number", options: { min: 0, max: null } },
  ],
};

/** Transactions collection — RLS: all operations scoped to `user = @request.auth.id` */
export const transactionsCollection: CollectionSchema = {
  name: "transactions",
  type: "base",
  ...userRLS,
  fields: [
    {
      name: "user",
      type: "relation",
      required: true,
      options: { collectionId: "_pb_users_auth_", maxSelect: 1 },
    },
    { name: "description", type: "text", required: true },
    {
      name: "type",
      type: "select",
      required: true,
      options: { values: ["income", "expense", "deposit", "withdrawal"], maxSelect: 1 },
    },
    { name: "amount", type: "number", required: true, options: { min: 0, max: null } },
    {
      name: "bank",
      type: "relation",
      required: true,
      options: { collectionId: "banks", maxSelect: 1 },
    },
    {
      name: "categories",
      type: "relation",
      required: true,
      options: { collectionId: "categories", maxSelect: null },
    },
    { name: "date", type: "date", required: true },
  ],
};

/** Planned transactions collection — RLS: all operations scoped to `user = @request.auth.id` */
export const plannedTransactionsCollection: CollectionSchema = {
  name: "planned_transactions",
  type: "base",
  ...userRLS,
  fields: [
    {
      name: "user",
      type: "relation",
      required: true,
      options: { collectionId: "_pb_users_auth_", maxSelect: 1 },
    },
    { name: "description", type: "text", required: true },
    {
      name: "type",
      type: "select",
      required: true,
      options: { values: ["income", "expense", "deposit", "withdrawal"], maxSelect: 1 },
    },
    { name: "amount", type: "number", required: true, options: { min: 0, max: null } },
    {
      name: "bank",
      type: "relation",
      required: true,
      options: { collectionId: "banks", maxSelect: 1 },
    },
    {
      name: "categories",
      type: "relation",
      required: true,
      options: { collectionId: "categories", maxSelect: null },
    },
    { name: "recurrence", type: "json", required: true },
    { name: "timezone", type: "number", required: true },
    { name: "previousDate", type: "date" },
    { name: "invokeDate", type: "date", required: true },
    { name: "lastNotifiedAt", type: "date" },
    { name: "active", type: "bool", required: true },
  ],
};

/** Tokens collection — RLS: all operations scoped to `user = @request.auth.id` */
export const tokensCollection: CollectionSchema = {
  name: "tokens",
  type: "base",
  ...userRLS,
  fields: [
    {
      name: "user",
      type: "relation",
      required: true,
      options: { collectionId: "_pb_users_auth_", maxSelect: 1 },
    },
    { name: "name", type: "text", required: true },
    { name: "symbol", type: "text", required: true },
    { name: "coingecko_id", type: "text", required: true },
    { name: "total", type: "number", required: true, options: { min: 0, max: null } },
    { name: "costAvg", type: "number", required: true, options: { min: 0, max: null } },
  ],
};

/** Push subscriptions collection — RLS: all operations scoped to `user = @request.auth.id` */
export const pushSubscriptionsCollection: CollectionSchema = {
  name: "push_subscriptions",
  type: "base",
  ...userRLS,
  fields: [
    {
      name: "user",
      type: "relation",
      required: true,
      options: { collectionId: "_pb_users_auth_", maxSelect: 1 },
    },
    { name: "endpoint", type: "text", required: true },
    { name: "keys", type: "json", required: true },
  ],
};

/** All application collection schemas */
export const collections: CollectionSchema[] = [
  banksCollection,
  categoriesCollection,
  transactionsCollection,
  plannedTransactionsCollection,
  tokensCollection,
  pushSubscriptionsCollection,
];
