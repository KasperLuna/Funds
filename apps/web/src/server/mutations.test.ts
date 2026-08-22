/**
 * Integration tests for the tRPC mutations router
 * RED-GREEN: write RED first, then implement to GREEN
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "./db.js";
import { auth } from "./auth.js";
import * as schema from "@funds/db/schema";
import { eq } from "drizzle-orm";
import { createCaller } from "./routers/root.js";

function first<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("expected at least one row");
  return row;
}

// Test DB setup
const TEST_EMAIL = "mut-test@example.com";
const TEST_PASSWORD = "testpass123";

let testUserId: string;
let authCookie: string;

beforeAll(async () => {
  // Ensure DATABASE_URL points to test DB
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:54329/funds_test";
  
  const db = getDb();
  
  // Apply migrations
  await migrate(db, { migrationsFolder: "../../packages/db/drizzle" });
  
  // Seed test asset
  await db.insert(schema.assets).values({
    id: "test-asset-usd",
    kind: "fiat",
    code: "USD",
    name: "US Dollar",
    decimals: 2,
  }).onConflictDoNothing();
  
  // Sign up test user
  const signUpRes = await auth.api.signUpEmail({
    body: {
      email: TEST_EMAIL,
      name: "Test User",
      username: "testuser",
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
  // Clean in FK-safe order
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
  // Clean all
  await db.delete(schema.authSessions);
  await db.delete(schema.authAccounts);
  await db.delete(schema.users);
  await closeDb();
});

describe("applyMutations", () => {
  it("throws UNAUTHORIZED without session", async () => {
    const caller = createCaller({ headers: new Headers() });
    
    await expect(
      caller.applyMutations({
        batches: [{
          table: "transactions",
          upserts: [],
          deletes: [],
        }],
      })
    ).rejects.toThrow(/UNAUTHORIZED/);
  });
  
  it("inserts new transaction (upsert)", async () => {
    const db = getDb();
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });
    
    // Create test account
    const account = first(await db.insert(schema.accounts).values({
      id: "test-account-1",
      userId: testUserId,
      name: "Test Account",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
    }).returning());
    
    const now = Date.now();
    const txId = "tx-test-001";
    
    const result = await caller.applyMutations({
      batches: [{
        table: "transactions",
        upserts: [{
          id: txId,
          user_id: testUserId,
          account_id: account.id,
          asset_id: "test-asset-usd",
          amount_minor: -5000,
          type: "expense",
          description: "Test expense",
          category_ids: [],
          date: now,
          created_at: now,
          updated_at: now,
        }],
        deletes: [],
      }],
    });
    
    expect(result).toHaveLength(1);
    expect(result[0]!.table).toBe("transactions");
    expect(result[0]!.applied).toBe(1);
    expect(result[0]!.skipped).toHaveLength(0);
    
    // Verify DB
    const stored = first(await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId)));
    
    expect(stored).toBeDefined();
    expect(stored.userId).toBe(testUserId);
    expect(stored.amountMinor).toBe(-5000n);
    expect(stored.type).toBe("expense");
  });
  
  it("replay identical batch -> idempotent (0 applied)", async () => {
    const db = getDb();
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });
    
    const account = first(await db.insert(schema.accounts).values({
      id: "test-account-2",
      userId: testUserId,
      name: "Test Account 2",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
    }).returning());
    
    const now = Date.now();
    const txId = "tx-test-002";
    
    const batch = {
      batches: [{
        table: "transactions",
        upserts: [{
          id: txId,
          user_id: testUserId,
          account_id: account.id,
          asset_id: "test-asset-usd",
          amount_minor: -3000,
          type: "expense",
          description: "Replay test",
          category_ids: [],
          date: now,
          created_at: now,
          updated_at: now,
        }],
        deletes: [],
      }],
    };
    
    // First call
    const result1 = await caller.applyMutations(batch);
    expect(result1[0]!.applied).toBe(1);
    
    // Second call (replay)
    const result2 = await caller.applyMutations(batch);
    expect(result2[0]!.applied).toBe(0);
    expect(result2[0]!.skipped).toHaveLength(1);
    expect(result2[0]!.skipped[0]!.reason).toBe("replay");
    
    // Verify row count unchanged
    const rows = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId));
    expect(rows).toHaveLength(1);
  });
  
  it("stale batch (older updated_at) -> skipped", async () => {
    const db = getDb();
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });
    
    const account = first(await db.insert(schema.accounts).values({
      id: "test-account-3",
      userId: testUserId,
      name: "Test Account 3",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
    }).returning());
    
    const now = Date.now();
    const txId = "tx-test-003";
    
    // Insert newer version first
    await db.insert(schema.transactions).values({
      id: txId,
      userId: testUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -7000n,
      type: "expense",
      description: "Newer version",
      categoryIds: [],
      date: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    
    // Try to apply older version
    const result = await caller.applyMutations({
      batches: [{
        table: "transactions",
        upserts: [{
          id: txId,
          user_id: testUserId,
          account_id: account.id,
          asset_id: "test-asset-usd",
          amount_minor: -5000,
          type: "expense",
          description: "Older version",
          category_ids: [],
          date: now - 10000,
          created_at: now - 10000,
          updated_at: now - 10000, // older!
        }],
        deletes: [],
      }],
    });
    
    expect(result[0]!.applied).toBe(0);
    expect(result[0]!.skipped).toHaveLength(1);
    expect(result[0]!.skipped[0]!.reason).toBe("stale");
    
    // Verify DB unchanged
    const stored = first(await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId)));
    expect(stored.description).toBe("Newer version");
  });
  
  it("other-user row in batch -> skipped", async () => {
    const db = getDb();
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });
    
    // Create another user
    const otherUserRes = await auth.api.signUpEmail({
      body: {
        email: "mut-other@example.com",
        name: "Other User",
        username: "otheruser",
        password: "otherpass123",
      },
      asResponse: true,
    });
    const otherUserData = await otherUserRes.json() as { user: { id: string } };
    const otherUserId = otherUserData.user.id;
    
    const account = first(await db.insert(schema.accounts).values({
      id: "test-account-4",
      userId: testUserId,
      name: "Test Account 4",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
    }).returning());
    
    const now = Date.now();
    
    const result = await caller.applyMutations({
      batches: [{
        table: "transactions",
        upserts: [{
          id: "tx-test-004",
          user_id: otherUserId, // different user!
          account_id: account.id,
          asset_id: "test-asset-usd",
          amount_minor: -5000,
          type: "expense",
          description: "Other user tx",
          category_ids: [],
          date: now,
          created_at: now,
          updated_at: now,
        }],
        deletes: [],
      }],
    });
    
    expect(result[0]!.applied).toBe(0);
    expect(result[0]!.skipped).toHaveLength(1);
    expect(result[0]!.skipped[0]!.reason).toBe("other-user");
    
    // Verify not stored
    const rows = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, "tx-test-004"));
    expect(rows).toHaveLength(0);
  });
  
  it("delete tombstone -> sets deleted_at", async () => {
    const db = getDb();
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });
    
    const account = first(await db.insert(schema.accounts).values({
      id: "test-account-5",
      userId: testUserId,
      name: "Test Account 5",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
    }).returning());
    
    const now = Date.now();
    const txId = "tx-test-005";
    
    // Insert row first
    await db.insert(schema.transactions).values({
      id: txId,
      userId: testUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -4000n,
      type: "expense",
      description: "To be deleted",
      categoryIds: [],
      date: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    
    // Apply delete tombstone
    const deletedAt = now + 5000;
    const result = await caller.applyMutations({
      batches: [{
        table: "transactions",
        upserts: [],
        deletes: [{
          id: txId,
          user_id: testUserId,
          account_id: account.id,
          asset_id: "test-asset-usd",
          amount_minor: -4000,
          type: "expense",
          description: "To be deleted",
          category_ids: [],
          date: now,
          created_at: now,
          updated_at: deletedAt, // newer
          deleted_at: deletedAt,
        }],
      }],
    });
    
    expect(result[0]!.applied).toBe(1);
    
    // Verify deleted_at set
    const stored = first(await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId)));
    expect(stored.deletedAt).toBeTruthy();
  });
  
  it("LWW: newer updated_at wins", async () => {
    const db = getDb();
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });
    
    const account = first(await db.insert(schema.accounts).values({
      id: "test-account-6",
      userId: testUserId,
      name: "Test Account 6",
      kind: "bank",
      assetId: "test-asset-usd",
      openingBalanceMinor: 0n,
    }).returning());
    
    const now = Date.now();
    const txId = "tx-test-006";
    
    // Insert old version
    await db.insert(schema.transactions).values({
      id: txId,
      userId: testUserId,
      accountId: account.id,
      assetId: "test-asset-usd",
      amountMinor: -1000n,
      type: "expense",
      description: "Old description",
      categoryIds: [],
      date: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    
    // Apply newer version
    const result = await caller.applyMutations({
      batches: [{
        table: "transactions",
        upserts: [{
          id: txId,
          user_id: testUserId,
          account_id: account.id,
          asset_id: "test-asset-usd",
          amount_minor: -2000,
          type: "expense",
          description: "New description",
          category_ids: [],
          date: now,
          created_at: now,
          updated_at: now + 5000, // newer!
        }],
        deletes: [],
      }],
    });
    
    expect(result[0]!.applied).toBe(1);
    
    // Verify newer fields stored
    const stored = first(await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId)));
    expect(stored.description).toBe("New description");
    expect(stored.amountMinor).toBe(-2000n);
  });
  
  it("unknown table -> skipped", async () => {
    const caller = createCaller({ headers: new Headers({ cookie: authCookie }) });
    
    const result = await caller.applyMutations({
      batches: [{
        table: "unknown_table",
        upserts: [{
          id: "test-001",
          user_id: testUserId,
          created_at: Date.now(),
          updated_at: Date.now(),
        }],
        deletes: [],
      }],
    });
    
    expect(result[0]!.table).toBe("unknown_table");
    expect(result[0]!.applied).toBe(0);
    expect(result[0]!.skipped).toHaveLength(1);
    expect(result[0]!.skipped[0]!.reason).toBe("unknown-table");
  });
});
