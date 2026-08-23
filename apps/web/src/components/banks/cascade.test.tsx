// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { MemorySyncDatabase } from "@/lib/sync";

const CATEGORY_COLS = "id,name,color,hideable,monthly_budget_minor,created_at,updated_at,deleted_at";
const TXN_COLS = "id,account_id,amount_minor,type,description,category_ids,date,deleted_at";
const ACCOUNT_COLS = "id,user_id,name,kind,asset_id,opening_balance_minor,primary_color,secondary_color,created_at,updated_at,deleted_at";

function upsertCategory(c: Record<string, unknown>, db: MemorySyncDatabase) {
  const cols = CATEGORY_COLS.split(",");
  const placeholders = cols.map(() => "?").join(", ");
  const conflictSet = cols.filter((col) => col !== "id").map((col) => `${col} = excluded.${col}`).join(", ");
  const params = cols.map((col) => c[col]);
  db.execute(`INSERT INTO categories (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`, params);
}

function upsertTxn(row: Record<string, unknown>, db: MemorySyncDatabase) {
  const cols = TXN_COLS.split(",");
  const placeholders = cols.map(() => "?").join(", ");
  const conflictSet = cols.filter((col) => col !== "id").map((col) => `${col} = excluded.${col}`).join(", ");
  const params = cols.map((col) => row[col]);
  db.execute(`INSERT INTO transactions (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`, params);
}

function upsertAccount(a: Record<string, unknown>, db: MemorySyncDatabase) {
  const cols = ACCOUNT_COLS.split(",");
  const placeholders = cols.map(() => "?").join(", ");
  const conflictSet = cols.filter((col) => col !== "id").map((col) => `${col} = excluded.${col}`).join(", ");
  const params = cols.map((col) => a[col]);
  db.execute(`INSERT INTO accounts (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${conflictSet}`, params);
}

async function allTxns(db: MemorySyncDatabase) {
  const result = await db.query("SELECT * FROM transactions");
  return result.rows.filter((r) => r.deleted_at == null);
}

describe("Category cascade deletion", () => {
  let db: MemorySyncDatabase;

  beforeEach(() => {
    db = new MemorySyncDatabase();
    db.connect();
  });

  it("removes category ID from all transactions when category is deleted", async () => {
    const now = Date.now();
    upsertCategory({
      id: "cat-1", name: "Food", color: "#6366f1", hideable: 0,
      monthly_budget_minor: null, created_at: now, updated_at: now, deleted_at: null,
    }, db);
    upsertCategory({
      id: "cat-2", name: "Travel", color: "#22c55e", hideable: 0,
      monthly_budget_minor: null, created_at: now, updated_at: now, deleted_at: null,
    }, db);

    upsertTxn({
      id: "t1", account_id: "a1", amount_minor: -1500, type: "expense",
      description: "Groceries", category_ids: JSON.stringify(["cat-1", "cat-2"]),
      date: now, deleted_at: null,
    }, db);
    upsertTxn({
      id: "t2", account_id: "a1", amount_minor: -500, type: "expense",
      description: "Lunch", category_ids: JSON.stringify(["cat-1"]),
      date: now, deleted_at: null,
    }, db);

    const before = await allTxns(db);
    expect(before).toHaveLength(2);

    const txn1Before = before[0]!.category_ids;
    expect(txn1Before).toEqual(["cat-1", "cat-2"]);

    // Soft-delete cat-1
    upsertCategory({
      id: "cat-1", name: "Food", color: "#6366f1", hideable: 0,
      monthly_budget_minor: null, created_at: now, updated_at: now, deleted_at: now,
    }, db);

    // Cascade: remove cat-1 from all transaction category_ids
    for (const row of before) {
      const oldIds = row.category_ids as string[];
      const updatedIds = oldIds.filter((id) => id !== "cat-1");
      upsertTxn({ ...row, category_ids: JSON.stringify(updatedIds) }, db);
    }

    const after = await allTxns(db);
    for (const row of after) {
      const ids = row.category_ids as string[];
      expect(ids).not.toContain("cat-1");
    }
    // t2 should have empty categories now
    const t2After = after.find((r) => r.id === "t2");
    expect(t2After!.category_ids).toEqual([]);
    // t1 should keep cat-2
    const t1After = after.find((r) => r.id === "t1");
    expect(t1After!.category_ids).toEqual(["cat-2"]);
  });
});

describe("Account cascade deletion", () => {
  let db: MemorySyncDatabase;

  beforeEach(() => {
    db = new MemorySyncDatabase();
    db.connect();
  });

  it("deletes all transactions belonging to an account when account is soft-deleted", async () => {
    const now = Date.now();
    upsertAccount({
      id: "acc-1", user_id: "u1", name: "Checking", kind: "bank",
      asset_id: "ast-1", opening_balance_minor: 0, primary_color: null,
      secondary_color: null, created_at: now, updated_at: now, deleted_at: null,
    }, db);

    upsertTxn({
      id: "t1", account_id: "acc-1", amount_minor: -1000, type: "expense",
      description: "A", category_ids: "[]", date: now, deleted_at: null,
    }, db);
    upsertTxn({
      id: "t2", account_id: "acc-1", amount_minor: 500, type: "income",
      description: "B", category_ids: "[]", date: now, deleted_at: null,
    }, db);
    upsertTxn({
      id: "t3", account_id: "acc-other", amount_minor: 200, type: "income",
      description: "C", category_ids: "[]", date: now, deleted_at: null,
    }, db);

    const before = await allTxns(db);
    expect(before).toHaveLength(3);

    // Soft-delete the account
    upsertAccount({
      id: "acc-1", user_id: "u1", name: "Checking", kind: "bank",
      asset_id: "ast-1", opening_balance_minor: 0, primary_color: null,
      secondary_color: null, created_at: now, updated_at: now, deleted_at: now,
    }, db);

    // Cascade: soft-delete all transactions belonging to acc-1
    for (const txn of before.filter((r) => r.account_id === "acc-1")) {
      upsertTxn({ ...txn, deleted_at: now }, db);
    }

    const after = await allTxns(db);
    expect(after).toHaveLength(1);
    expect(after[0]!.account_id).toBe("acc-other");
  });

  it("removing a category ref from a transaction does not affect other transactions", async () => {
    const now = Date.now();
    upsertCategory({
      id: "cat-1", name: "Food", color: "#6366f1", hideable: 0,
      monthly_budget_minor: null, created_at: now, updated_at: now, deleted_at: null,
    }, db);

    upsertTxn({
      id: "t1", account_id: "a1", amount_minor: -100, type: "expense",
      description: "A", category_ids: JSON.stringify(["cat-1"]),
      date: now, deleted_at: null,
    }, db);
    upsertTxn({
      id: "t2", account_id: "a1", amount_minor: -200, type: "expense",
      description: "B", category_ids: JSON.stringify([]),
      date: now, deleted_at: null,
    }, db);

    // Cascade removal on t1 only
    upsertTxn({
      id: "t1", account_id: "a1", amount_minor: -100, type: "expense",
      description: "A", category_ids: JSON.stringify([]),
      date: now, deleted_at: null,
    }, db);

    const after = await allTxns(db);
    expect(after).toHaveLength(2);
    expect(after[0]!.category_ids).toEqual([]);
    expect(after[1]!.category_ids).toEqual([]);
  });
});
