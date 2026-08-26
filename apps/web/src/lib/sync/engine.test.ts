// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDexieStore, onRemoteWipe, type DexieStore } from "./store.js";
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
    autoSync: false,
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
    // Retry is fired via an unawaited syncNow; poll until the drain lands.
    for (let i = 0; i < 200 && (await outboxCount()) > 0; i++) await tick();
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

  it("steady-state tick re-arms at 30s; failed tick probes at 2s", async () => {
    const delays: number[] = [];
    let lastFn: () => void = () => {};
    const si = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation(((fn: () => void, delay?: number) => {
        delays.push(Number(delay));
        lastFn = fn;
        return 0;
      }) as unknown as typeof setInterval);
    const ci = vi.spyOn(globalThis, "clearInterval").mockImplementation(() => {});
    const settle = async (pred: () => boolean): Promise<void> => {
      for (let i = 0; i < 100 && !pred(); i++) {
        await new Promise((r) => setTimeout(r, 2));
      }
    };
    try {
      // This test exercises the real auto-sync arming path.
      const ticking = createSyncEngine({
        store,
        fetch: fetchMock as typeof fetch,
        getUserId: () => "user1",
        push: pushMock,
      });
      engine = ticking;
      ticking.start();
      await settle(() => engine.getState().lastSyncedAt !== null);
      expect(delays).toEqual([30_000]);

      lastFn();
      await settle(() => delays.length >= 2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(delays[1]).toBe(30_000);

      fetchMock.mockRejectedValueOnce(new Error("down"));
      lastFn();
      await settle(() => engine.getState().online === false && delays.length >= 3);
      expect(delays[2]).toBe(2_000);

      engine.stop();
    } finally {
      si.mockRestore();
      ci.mockRestore();
    }
  });

  it("applies pulled rows in one transaction (single liveQuery emission)", async () => {
    const txSpy = vi.spyOn(store.db, "transaction");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        since: 5000,
        rows: [
          { table: "accounts", row: { id: "a1", name: "A", updated_at: 5000 } },
          { table: "categories", row: { id: "c1", name: "Food", updated_at: 5000 } },
        ],
      }),
    } as Response);
    await engine.syncNow();

    expect(txSpy).toHaveBeenCalledTimes(1);
    const accounts = await store.query("SELECT * FROM accounts");
    const categories = await store.query("SELECT * FROM categories");
    expect(accounts.rows.map((r) => r.id)).toEqual(["a1"]);
    expect(categories.rows.map((r) => r.id)).toEqual(["c1"]);
    engine.stop();
  });

  it("account switch (A -> B) wipes previous user's local data before syncing B", async () => {
    engine.start();
    await store.table("accounts").upsert({ id: "a1", name: "A data" });
    await tick();
    engine.stop();
    expect(await outboxCount()).toBe(1);

    // cavetail: sibling engine gets its OWN store instance over the same
    // physical DB (mirrors a second tab / fresh provider). Sharing one Dexie
    // object would stack a second unguarded hook set and self-disturb.
    const storeB = createDexieStore(store.db.name);
    const engineB = createSyncEngine({
      store: storeB,
      fetch: fetchMock as typeof fetch,
      getUserId: () => "user2",
      push: pushMock,
    });
    engineB.start();
    for (let i = 0; i < 200; i++) {
      if ((await storeB.db.table("_meta").get("lastUserId"))?.value === "user2") break;
      await tick();
    }
    expect((await storeB.query("SELECT * FROM accounts")).rows).toHaveLength(0);
    expect(await storeB.db.table("_outbox").count()).toBe(0);
    expect(await storeB.db.table("_meta").get("lastUserId")).toMatchObject({ value: "user2" });
    engineB.stop();
  });

  it("first sign-in (null -> user) keeps pending guest writes and uploads them", async () => {
    // Guest wrote while signed out: hooks captured it, nothing wiped yet.
    await store.table("accounts").upsert({ id: "g1", name: "Guest entry" });
    await tick();
    engine.start();
    await engine.syncNow();
    const batches = pushMock.mock.calls[0]?.[0] as Batch[] | undefined;
    const upsert = batches?.flatMap((b) => b.upserts).find((r) => r.id === "g1");
    expect(upsert).toBeTruthy();
    expect(upsert!.user_id).toBe("user1");
    expect((await store.query("SELECT * FROM accounts")).rows).toHaveLength(1);
    engine.stop();
  });

  it("same user re-start does not wipe", async () => {
    engine.start();
    await store.table("accounts").upsert({ id: "a1", name: "Keep me" });
    await tick();
    engine.stop();

    const again = createSyncEngine({
      store,
      fetch: fetchMock as typeof fetch,
      getUserId: () => "user1",
      push: pushMock,
    });
    again.start();
    for (let i = 0; i < 50; i++) {
      if ((await store.db.table("_meta").get("lastUserId"))?.value === "user1") break;
      await tick();
    }
    expect((await store.query("SELECT * FROM accounts")).rows).toHaveLength(1);
    again.stop();
  });

  it("broadcastWipe notifies onRemoteWipe listeners (multi-tab stop signal)", async () => {
    if (typeof BroadcastChannel === "undefined") {
      // jsdom without BroadcastChannel: feature degrades silently in prod too.
      return;
    }
    const seen = vi.fn();
    const unsub = onRemoteWipe(seen);
    // A sibling tab owns its own channel instance; a channel never receives
    // its own messages (spec), which is what prevents same-tab loops.
    const sibling = new BroadcastChannel("funds-sync-wipe");
    sibling.postMessage("wiped");
    // Delivery is async and load-dependent; poll instead of one tick.
    for (let i = 0; i < 200 && seen.mock.calls.length === 0; i++) await tick();
    expect(seen).toHaveBeenCalledTimes(1);
    unsub();
    sibling.postMessage("wiped");
    await tick();
    expect(seen).toHaveBeenCalledTimes(1);
    sibling.close();
  });
});
