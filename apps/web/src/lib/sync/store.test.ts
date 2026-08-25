// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createDexieStore, type DexieStore } from "./store.js";

let seq = 0;
let store: DexieStore;

beforeEach(() => {
  seq++;
  store = createDexieStore(`store-test-${Date.now()}-${seq}`);
});

describe("DexieStore", () => {
  it("upsert then query returns money as BigInt", async () => {
    await store.table("accounts").upsert({
      id: "a1",
      name: "Checking",
      opening_balance_minor: 12345n,
      archived: 0,
    });
    const res = await store.query("SELECT * FROM accounts");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ id: "a1", archived: 0 });
    expect(res.rows[0]!.opening_balance_minor).toBe(12345n);
  });

  it("persists money as string in the underlying Dexie table", async () => {
    await store.table("accounts").upsert({ id: "a1", opening_balance_minor: 12345n });
    const raw = await store.db.table("accounts").toArray();
    expect(raw[0].opening_balance_minor).toBe("12345");
  });

  it("filters with IS NULL and ? equality", async () => {
    await store.table("transactions").upsert({
      id: "t1",
      account_id: "a1",
      amount_minor: -1500n,
      deleted_at: null,
    });
    await store.table("transactions").upsert({
      id: "t2",
      account_id: "a2",
      amount_minor: 500n,
      deleted_at: Date.now(),
    });
    const res = await store.query(
      "SELECT * FROM transactions WHERE deleted_at IS NULL AND account_id = ?",
      ["a1"],
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.id).toBe("t1");
    expect(res.rows[0]!.amount_minor).toBe(-1500n);
  });

  it("supports ORDER BY created_at DESC", async () => {
    await store.table("categories").upsert({ id: "c1", created_at: 100 });
    await store.table("categories").upsert({ id: "c3", created_at: 200 });
    await store.table("categories").upsert({ id: "c2", created_at: 300 });
    const res = await store.query(
      "SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY created_at DESC",
    );
    expect(res.rows.map((r) => r.id)).toEqual(["c2", "c3", "c1"]);
  });

  it("update and deleteById work", async () => {
    await store.table("accounts").upsert({
      id: "a1",
      name: "One",
      opening_balance_minor: 100n,
    });
    await store.table("accounts").update({
      id: "a1",
      name: "One updated",
      opening_balance_minor: 200n,
    });
    const res = await store.query("SELECT * FROM accounts WHERE id = ?", ["a1"]);
    expect(res.rows[0]!.name).toBe("One updated");
    expect(res.rows[0]!.opening_balance_minor).toBe(200n);

    await store.table("accounts").deleteById("a1");
    const after = await store.query("SELECT * FROM accounts");
    expect(after.rows).toHaveLength(0);
  });

  it("wipe clears entity and internal tables", async () => {
    await store.table("accounts").upsert({ id: "a1", opening_balance_minor: 1n });
    await store.table("transactions").upsert({ id: "t1", amount_minor: 2n });
    await store.db.table("_meta").put({ key: "watermark", value: 123 });
    await store.wipe();
    expect((await store.query("SELECT * FROM accounts")).rows).toHaveLength(0);
    expect((await store.query("SELECT * FROM transactions")).rows).toHaveLength(0);
    expect(await store.db.table("_meta").count()).toBe(0);
  });

  it("watch yields current result then re-yields on upsert", async () => {
    const events: unknown[][] = [];
    const consume = (async () => {
      for await (const r of store.watch("SELECT * FROM accounts")) {
        events.push(r.rows);
        if (r.rows.length >= 2) break;
      }
    })();
    await store.table("accounts").upsert({ id: "a1", opening_balance_minor: 100n });
    await store.table("accounts").upsert({ id: "a2", opening_balance_minor: 200n });
    await consume;
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[events.length - 1]).toHaveLength(2);
  });

  it("throws on unsupported SQL", async () => {
    await expect(store.query("SELECT name FROM accounts")).rejects.toThrow(
      /Unsupported SELECT/,
    );
  });
});