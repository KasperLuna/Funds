/**
 * PocketBase collection schema definitions.
 *
 * Each collection includes field definitions and Row-Level Security (RLS) rules
 * ensuring users can only access their own data:
 *   - listRule / viewRule / updateRule / deleteRule: `user = @request.auth.id`
 *   - createRule: `@request.data.user = @request.auth.id`
 *     (ensures users can only create records for themselves)
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

/** RLS rules scoped to the authenticated user */
const userRLS = {
  listRule: "user = @request.auth.id",
  viewRule: "user = @request.auth.id",
  createRule: "@request.data.user = @request.auth.id",
  updateRule: "user = @request.auth.id",
  deleteRule: "user = @request.auth.id",
};

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
