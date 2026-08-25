import { describe, it, expect, beforeEach } from "vitest";
import { MemorySyncDatabase } from "./memory-sync.js";
import type { RowRecord } from "./types.js";

const UPSERT_SQL = `INSERT INTO todos (id, title) VALUES (?, ?)
  ON CONFLICT (id) DO UPDATE SET title = excluded.title`;

function newDb(): MemorySyncDatabase {
  const db = new MemorySyncDatabase();
  db.connect();
  return db;
}

describe("MemorySyncDatabase", () => {
  let db: MemorySyncDatabase;

  beforeEach(() => {
    db = newDb();
  });

  it("query returns rows", async () => {
    await db.execute(UPSERT_SQL, ["a", "first"]);
    const res = await db.query("SELECT * FROM todos");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0] as RowRecord).toMatchObject({ id: "a", title: "first" });
  });

  it("execute upsert inserts then select finds it", async () => {
    await db.execute(UPSERT_SQL, ["a", "hello"]);
    const res = await db.query("SELECT * FROM todos WHERE id = ?", ["a"]);
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as RowRecord).title).toBe("hello");
  });

  it("upsert overwrites same id", async () => {
    await db.execute(UPSERT_SQL, ["a", "v1"]);
    await db.execute(UPSERT_SQL, ["a", "v2"]);
    const res = await db.query("SELECT * FROM todos WHERE id = ?", ["a"]);
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as RowRecord).title).toBe("v2");
  });

  it("deleteById removes", async () => {
    await db.execute(UPSERT_SQL, ["a", "x"]);
    const del = await db.execute("DELETE FROM todos WHERE id = ?", ["a"]);
    expect(del.rowsAffected).toBe(1);
    const res = await db.query("SELECT * FROM todos");
    expect(res.rows).toHaveLength(0);
  });

  it("query supports IS NULL / IS NOT NULL WHERE terms", async () => {
    await db.execute(UPSERT_SQL, ["a", "first"]);
    await db.execute(
      "INSERT INTO todos (id, title, deleted_at) VALUES (?, ?, ?)",
      ["b", "second", 123],
    );
    const active = await db.query("SELECT * FROM todos WHERE deleted_at IS NULL");
    expect(active.rows).toHaveLength(1);
    expect((active.rows[0] as RowRecord).id).toBe("a");
    const deleted = await db.query("SELECT * FROM todos WHERE deleted_at IS NOT NULL");
    expect(deleted.rows).toHaveLength(1);
    expect((deleted.rows[0] as RowRecord).id).toBe("b");
  });

  it("query supports literal numeric equality WHERE terms", async () => {
    await db.execute(
      "INSERT INTO todos (id, title, archived) VALUES (?, ?, ?)",
      ["a", "one", 0],
    );
    await db.execute(
      "INSERT INTO todos (id, title, archived) VALUES (?, ?, ?)",
      ["b", "two", 1],
    );
    const active = await db.query("SELECT * FROM todos WHERE deleted_at IS NULL AND archived = 0");
    expect(active.rows).toHaveLength(1);
    expect((active.rows[0] as RowRecord).id).toBe("a");
    const archived = await db.query("SELECT * FROM todos WHERE deleted_at IS NULL AND archived = 1");
    expect(archived.rows).toHaveLength(1);
    expect((archived.rows[0] as RowRecord).id).toBe("b");
  });

  it("watch yields updates on mutation for matching table", async () => {
    const events: RowRecord[][] = [];
    const consume = (async () => {
      for await (const r of db.watch("SELECT * FROM todos")) {
        events.push(r.rows);
        if (events.length >= 2) break;
      }
    })();
    await db.execute(UPSERT_SQL, ["a", "one"]);
    await db.execute(UPSERT_SQL, ["b", "two"]);
    await consume;
    expect(events.length).toBe(2);
    expect(events[0]).toHaveLength(1);
    expect(events[1]).toHaveLength(2);
  });

  it("money columns round-trip as BigInt via table().upsert", async () => {
    await db.table("accounts").upsert({
      id: "a1",
      name: "Checking",
      opening_balance_minor: 12345n,
      archived: 0,
    });
    const res = await db.query("SELECT * FROM accounts");
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as RowRecord).opening_balance_minor).toBe(12345n);

    await db.table("accounts").upsert({ id: "a2", opening_balance_minor: 500 });
    const res2 = await db.query("SELECT * FROM accounts WHERE id = ?", ["a2"]);
    expect((res2.rows[0] as RowRecord).opening_balance_minor).toBe(500n);
  });

  it("isConnected toggles via connect", async () => {
    const d = new MemorySyncDatabase();
    expect(d.isConnected).toBe(false);
    d.connect();
    expect(d.isConnected).toBe(true);
    await d.disconnect();
    expect(d.isConnected).toBe(false);
  });
});
