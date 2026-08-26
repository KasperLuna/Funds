// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createDexieStore, type DexieStore } from "@/lib/sync/store";
import {
  persistSubscription,
  tombstoneSubscriptions,
} from "./notifications";

let seq = 0;
let store: DexieStore;

beforeEach(() => {
  seq++;
  store = createDexieStore(`push-test-${Date.now()}-${seq}`);
});

const SUB = {
  endpoint: "https://push.example/abc",
  keys: { p256dh: "p256", auth: "auth" },
};

describe("persistSubscription", () => {
  it("writes a push_subscriptions row for the user", async () => {
    const id = await persistSubscription(store, "user1", SUB, 1000);
    const rows = await store.query(
      "SELECT * FROM push_subscriptions WHERE deleted_at IS NULL",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({
      id,
      user_id: "user1",
      endpoint: SUB.endpoint,
      keys: SUB.keys,
      created_at: 1000,
    });
  });

  it("re-subscribing the same endpoint tombstones the old row and keeps one live", async () => {
    await persistSubscription(store, "user1", SUB, 1000);
    await persistSubscription(store, "user1", SUB, 2000);
    const live = await store.query(
      "SELECT * FROM push_subscriptions WHERE deleted_at IS NULL",
    );
    expect(live.rows).toHaveLength(1);
    expect(live.rows[0]!.created_at).toBe(2000);
  });
});

describe("tombstoneSubscriptions", () => {
  it("soft-deletes all live rows", async () => {
    await persistSubscription(store, "user1", SUB, 1000);
    await tombstoneSubscriptions(store, 3000);
    const live = await store.query(
      "SELECT * FROM push_subscriptions WHERE deleted_at IS NULL",
    );
    expect(live.rows).toHaveLength(0);
    const all = await store.query("SELECT * FROM push_subscriptions");
    expect(all.rows[0]!.deleted_at).toBe(3000);
  });
});
