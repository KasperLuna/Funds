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

  it("isConnected toggles via connect", async () => {
    const d = new MemorySyncDatabase();
    expect(d.isConnected).toBe(false);
    d.connect();
    expect(d.isConnected).toBe(true);
    await d.disconnect();
    expect(d.isConnected).toBe(false);
  });
});
