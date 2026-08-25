// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDexieStore, type DexieStore } from "./store.js";
import { createSyncEngine, type Batch, type SyncEngine } from "./engine.js";

let seq = 0;
let store: DexieStore;
let engine: SyncEngine;
let fetchMock: ReturnType<typeof vi.fn>;
let pushMock: ReturnType<typeof vi.fn>;

const emptyDelta = { since: Date.now(), rows: [] };

beforeEach(() => {
  seq++;
  store = createDexieStore(`engine-test-${Date.now()}-${seq}`);
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => emptyDelta,
  } as Response);
  pushMock = vi.fn().mockResolvedValue({});
  engine = createSyncEngine({
    store,
    fetch: fetchMock as typeof fetch,
    getUserId: () => "user1",
    push: pushMock,
  });
});

async function tick(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

async function outboxCount(): Promise<number> {
  return store.db.table("_outbox").count();
}

describe("sync engine", () => {
  it("write -> outbox enqueue via Dexie hook", async () => {
    engine.start();
    await store.table("accounts").upsert({
      id: "a1",
      name: "Checking",
      opening_balance_minor: 100n,
    });
    await tick();
    const entries = await store.db.table("_outbox").toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      key: "accounts:a1",
      table: "accounts",
      id: "a1",
      op: "upsert",
    });
    engine.stop();
  });

  it("coalesces: upsert same id twice -> one entry with latest snapshot", async () => {
    engine.start();
    await store.table("accounts").upsert({ id: "a1", name: "One" });
    await store.table("accounts").upsert({ id: "a1", name: "Two" });
    await tick();
    const entries = await store.db.table("_outbox").toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.row).toMatchObject({ id: "a1", name: "Two" });
    engine.stop();
  });

  it("push on syncNow drains outbox and sends batch", async () => {
    engine.start();
    await store.table("accounts").upsert({
      id: "a1",
      name: "Checking",
      opening_balance_minor: 100n,
    });
    await tick();
    await engine.syncNow();
    expect(pushMock).toHaveBeenCalledTimes(1);
    const batches = pushMock.mock.calls[0]![0] as Batch[];
    const accounts = batches.find((b) => b.table === "accounts");
    expect(accounts).toBeDefined();
    expect(accounts!.upserts[0]).toMatchObject({ id: "a1", name: "Checking" });
    expect(await outboxCount()).toBe(0);
    engine.stop();
  });

  it("network failure -> online=false + outbox retained; retry drains", async () => {
    engine.start();
    await store.table("accounts").upsert({ id: "a1", name: "Checking" });
    await tick();

    pushMock.mockRejectedValueOnce(new Error("network down"));
    await engine.syncNow();
    expect(engine.getState().online).toBe(false);
    expect(await outboxCount()).toBe(1);

    pushMock.mockResolvedValue({});
    engine.setOnline(true);
    await tick();
    expect(pushMock).toHaveBeenCalled();
    expect(await outboxCount()).toBe(0);
    expect(engine.getState().online).toBe(true);
    engine.stop();
  });

  it("self-recovers on a later syncNow after transient failure (no online event)", async () => {
    engine.start();
    await store.table("accounts").upsert({ id: "a1", name: "Checking" });
    await tick();

    pushMock.mockRejectedValueOnce(new Error("transient"));
    await engine.syncNow();
    expect(engine.getState().online).toBe(false);
    expect(await outboxCount()).toBe(1);

    // A subsequent syncNow probe (no browser `online` event) must recover.
    pushMock.mockResolvedValue({});
    await engine.syncNow();
    expect(engine.getState().online).toBe(true);
    expect(await outboxCount()).toBe(0);
    engine.stop();
  });

  it("pull applies rows and persists watermark", async () => {
    engine.start();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        since: 5000,
        rows: [
          {
            table: "accounts",
            row: {
              id: "a1",
              name: "Checking",
              updated_at: 5000,
              opening_balance_minor: "100",
            },
          },
        ],
      }),
    } as Response);
    await engine.syncNow();
    const res = await store.query("SELECT * FROM accounts");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ id: "a1", name: "Checking" });
    expect(res.rows[0]!.opening_balance_minor).toBe(100n);
    const meta = await store.db.table("_meta").get("watermark:user1");
    expect(meta?.value).toBe(5000);
    engine.stop();
  });

  it("delta pull fetches since watermark and applies only newer rows", async () => {
    engine.start();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        since: 5000,
        rows: [
          {
            table: "accounts",
            row: { id: "a1", name: "Old", updated_at: 5000 },
          },
        ],
      }),
    } as Response);
    await engine.syncNow();

    fetchMock.mockImplementationOnce(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("since=5000");
      return {
        ok: true,
        json: async () => ({
          since: 9000,
          rows: [
            {
              table: "accounts",
              row: { id: "a2", name: "New", updated_at: 9000 },
            },
          ],
        }),
      } as Response;
    });
    await engine.syncNow();

    const res = await store.query("SELECT * FROM accounts");
    expect(res.rows.map((r) => r.id).sort()).toEqual(["a1", "a2"]);
    const meta = await store.db.table("_meta").get("watermark:user1");
    expect(meta?.value).toBe(9000);
    engine.stop();
  });

  it("pulled rows do not re-enqueue into outbox", async () => {
    engine.start();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        since: 5000,
        rows: [
          {
            table: "accounts",
            row: { id: "a1", name: "Pulled", updated_at: 5000 },
          },
        ],
      }),
    } as Response);
    await engine.syncNow();
    expect(await outboxCount()).toBe(0);
    engine.stop();
  });

  it("wipe clears outbox, meta, and entity rows", async () => {
    engine.start();
    await store.table("accounts").upsert({ id: "a1", name: "Checking" });
    await store.db.table("_meta").put({ key: "watermark:user1", value: 123 });
    await tick();
    expect(await outboxCount()).toBe(1);
    await engine.wipe();
    expect(await outboxCount()).toBe(0);
    expect(await store.db.table("_meta").count()).toBe(0);
    expect((await store.query("SELECT * FROM accounts")).rows).toHaveLength(0);
    engine.stop();
  });

  it("captures writes even before start (session unresolved/offline)", async () => {
    // Hooks attach at engine creation, not on start(), so a write made while
    // the session is unresolved (offline) is still captured to the outbox.
    await store.table("accounts").upsert({ id: "a1", name: "Checking" });
    await tick();
    expect(await outboxCount()).toBe(1);
    engine.stop();
  });

  it("flush restamps user_id from resolved session (fixes offline 'local' stamp)", async () => {
    engine.start();
    // Simulate an offline write that carried a placeholder user_id.
    await store.table("accounts").upsert({
      id: "a1",
      user_id: "local",
      name: "Checking",
      opening_balance_minor: 100n,
    });
    await tick();
    await engine.syncNow();
    const batches = pushMock.mock.calls[0]![0] as Batch[];
    const upsert = batches.flatMap((b) => b.upserts).find((r) => r.id === "a1");
    expect(upsert).toBeTruthy();
    expect(upsert!.user_id).toBe("user1");
    expect(await outboxCount()).toBe(0);
    engine.stop();
  });
});
