/**
 * Integration tests for the sync delta-pull route (fetchDeltas helper) and the
 * money-string hardening in applyMutations.
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "./db.js";
import { auth } from "./auth.js";
import * as schema from "@funds/db/schema";
import { eq } from "drizzle-orm";
import { createCaller } from "./routers/root.js";
import { fetchDeltas } from "./sync-data.js";
import { serializeRow } from "./sync-serialize.js";

function first<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("expected at least one row");
  return row;
}

const TEST_EMAIL = "sd-test@example.com";
const TEST_PASSWORD = "testpass123";

let testUserId: string;
let authCookie: string;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:54329/funds_test";

  const db = getDb();

  await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });

  await db.insert(schema.assets).values({
    id: "test-asset-usd",
    kind: "fiat",
    code: "SDT",
    name: "US Dollar",
    decimals: 2,
  }).onConflictDoNothing();

  const signUpRes = await auth.api.signUpEmail({
    body: {
      email: TEST_EMAIL,
      name: "Test User",
      username: "sdtestuser",
      password: TEST_PASSWORD,
    },
    asResponse: true,
  });

  const signUpData = await signUpRes.json() as { user: { id: string } };
  testUserId = signUpData.user.id;
  authCookie = signUpRes.headers.get("set-cookie") ?? "";
});

afterEach(async () => {
  const db = getDb();
  await db.delete(schema.transactions);
  await db.delete(schema.templates);
  await db.delete(schema.scheduledTransactions);
  await db.delete(schema.pushSubscriptions);
  await db.delete(schema.trades);
  await db.delete(schema.transfers);
  await db.delete(schema.categories);
  await db.delete(schema.accounts);
});

afterAll(async () => {
  const db = getDb();
  await db.delete(schema.authSessions);
  await db.delete(schema.authAccounts);
  await db.delete(schema.users);
  await closeDb();
});

describe("serializeRow", () => {
  it("serializes money as strings, timestamps as ms, jsonb as objects", () => {
    const row = serializeRow({
      id: "a1",
      userId: "u1",
      name: "Acc",
      openingBalanceMinor: -5000n,
      colors: { primary_color: "#fff" },
      updatedAt: new Date(1700000000000),
      archived: false,
    }, {
      id: "id",
      userId: "user_id",
      name: "name",
      openingBalanceMinor: "opening_balance_minor",
      colors: "colors",
      updatedAt: "updated_at",
      archived: "archived",
    });

    expect(row.opening_balance_minor).toBe("-5000");
    expect(row.updated_at).toBe(1700000000000);
    expect(row.colors).toEqual({ primary_color: "#fff" });
    expect(row.archived).toBe(false);
    expect(row.id).toBe("a1");
  });
});

describe("fetchDeltas", () => {
  it("full snapshot: returns all rows across tables with money as strings", async () => {
    const db = getDb();

    const now = Date.now();
    const account = first(await db.insert(schema.accounts).values({
      id: "sd-acc-full-1",
      userId: testUserId,
      name: "Snapshot Account",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 12345n,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning());

    await db.insert(schema.transactions).values({
      id: "sd-tx-full-1",
      userId: testUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -5000n,
      type: "expense",
      description: "Snapshot expense",
      categoryIds: [],
      date: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now + 1000),
    });

    const result = await fetchDeltas(testUserId, null);

    const tx = result.rows.find((r) => r.row.id === "sd-tx-full-1");
    expect(tx).toBeDefined();
    expect(tx!.table).toBe("transactions");
    expect(tx!.row.amount_minor).toBe("-5000");
    expect(typeof tx!.row.updated_at).toBe("number");

    const acc = result.rows.find((r) => r.row.id === "sd-acc-full-1");
    expect(acc).toBeDefined();
    expect(acc!.row.opening_balance_minor).toBe("12345");

    expect(result.since).toBe(now + 1000);
  });

  it("delta pull: returns only new/changed rows since watermark, excludes other users", async () => {
    const db = getDb();

    const now = Date.now();
    const account = first(await db.insert(schema.accounts).values({
      id: "sd-acc-delta-1",
      userId: testUserId,
      name: "Delta Account",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning());

    const existing = first(await db.insert(schema.transactions).values({
      id: "sd-tx-delta-1",
      userId: testUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -1000n,
      type: "expense",
      description: "Existing",
      categoryIds: [],
      date: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning());

    const otherUserRes = await auth.api.signUpEmail({
      body: {
        email: "sd-other@example.com",
        name: "Other User",
        username: "sdother",
        password: "otherpass123",
      },
      asResponse: true,
    });
    const otherUserId = (await otherUserRes.json() as { user: { id: string } }).user.id;

    const watermark = existing.updatedAt.getTime();

    // Newer tx + bump existing + other-user row (all after watermark)
    const newer = Date.now() + 2000;
    await db.insert(schema.transactions).values({
      id: "sd-tx-delta-2",
      userId: testUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -2000n,
      type: "expense",
      description: "Newer",
      categoryIds: [],
      date: new Date(newer),
      createdAt: new Date(newer),
      updatedAt: new Date(newer),
    });

    await db.update(schema.transactions).set({ updatedAt: new Date(newer + 1000) })
      .where(eq(schema.transactions.id, "sd-tx-delta-1"));

    await db.insert(schema.transactions).values({
      id: "sd-tx-delta-3",
      userId: otherUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -9999n,
      type: "expense",
      description: "Other user",
      categoryIds: [],
      date: new Date(newer + 2000),
      createdAt: new Date(newer + 2000),
      updatedAt: new Date(newer + 2000),
    });

    const result = await fetchDeltas(testUserId, watermark);

    const ids = result.rows.map((r) => r.row.id).sort();
    expect(ids).toEqual(["sd-tx-delta-1", "sd-tx-delta-2"]);
    expect(result.rows.find((r) => r.row.id === "sd-tx-delta-3")).toBeUndefined();
    expect(result.since).toBe(newer + 1000);
  });

  it("full-snapshot fallback: since older than 90 days returns all rows", async () => {
    const db = getDb();

    const now = Date.now();
    const account = first(await db.insert(schema.accounts).values({
      id: "sd-acc-old-1",
      userId: testUserId,
      name: "Old Account",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning());

    await db.insert(schema.transactions).values({
      id: "sd-tx-old-1",
      userId: testUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -7000n,
      type: "expense",
      description: "Old row",
      categoryIds: [],
      date: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    const oldSince = now - 91 * 24 * 60 * 60 * 1000;

    const result = await fetchDeltas(testUserId, oldSince);

    const ids = result.rows.map((r) => r.row.id).sort();
    expect(ids).toEqual(["sd-acc-old-1", "sd-tx-old-1"]);
    expect(result.since).toBe(now);
  });

  it("money-string round trip through applyMutations", async () => {
    const db = getDb();
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });

    const account = first(await db.insert(schema.accounts).values({
      id: "sd-acc-string-1",
      userId: testUserId,
      name: "String Account",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
    }).returning());

    const now = Date.now();

    const result = await caller.applyMutations({
      batches: [{
        table: "transactions",
        upserts: [{
          id: "sd-tx-string-1",
          user_id: testUserId,
          account_id: account.id,
          asset_id: "test-asset-usd",
          amount_minor: "-5000",
          type: "expense",
          description: "String money",
          category_ids: [],
          date: now,
          created_at: now,
          updated_at: now,
        }],
        deletes: [],
      }],
    });

    expect(result[0]!.applied).toBe(1);

    const stored = first(await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, "sd-tx-string-1")));

    expect(stored.amountMinor).toBe(-5000n);
  });
});
