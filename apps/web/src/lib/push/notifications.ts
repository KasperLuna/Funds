// Client-side Web Push enrollment. Writes the browser subscription into the
// local sync store's `push_subscriptions` table; the sync engine's outbox
// pushes it to the server (applyMutations) where the reminder worker reads it.
import type { SyncDatabase } from "@/lib/sync/types";

// cavetail: self-contained ULID-like generator; production ids come from @funds/core ulid
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function newId(): string {
  const now = BigInt(Date.now());
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  const rand = BigInt(
    "0x" + Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join(""),
  );
  const encode = (value: bigint, chars: number) => {
    let v = value;
    let out = "";
    for (let i = 0; i < chars; i += 1) {
      out = ALPHABET[Number(v & 31n)] + out;
      v >>= 5n;
    }
    return out;
  };
  return encode(now, 10) + encode(rand, 16);
}

type PushKeys = { p256dh: string; auth: string };

export type PushSubscriptionData = {
  endpoint: string;
  keys: PushKeys;
};

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Persist a subscription for the session user, idempotently per endpoint.
 * Tombstones any prior non-deleted row for the same endpoint (a re-subscribe
 * after a pushsubscriptionchange) so the unique constraint holds, then upserts
 * the fresh row. Pure wrt the store — unit-testable with fake-indexeddb.
 */
export async function persistSubscription(
  db: SyncDatabase,
  userId: string,
  sub: PushSubscriptionData,
  now: number = Date.now(),
): Promise<string> {
  const existing = await db.query(
    "SELECT id FROM push_subscriptions WHERE endpoint = ? AND deleted_at IS NULL",
    [sub.endpoint],
  );
  for (const r of existing.rows) {
    await db.table("push_subscriptions").update({
      id: r.id,
      deleted_at: now,
    });
  }
  const id = newId();
  await db.table("push_subscriptions").upsert({
    id,
    user_id: userId,
    endpoint: sub.endpoint,
    keys: sub.keys,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  return id;
}

/**
 * Tombstone every non-deleted push_subscriptions row in this device's store.
 */
export async function tombstoneSubscriptions(db: SyncDatabase, now: number = Date.now()): Promise<void> {
  const rows = await db.query("SELECT id FROM push_subscriptions WHERE deleted_at IS NULL");
  for (const r of rows.rows) {
    await db.table("push_subscriptions").update({ id: r.id, deleted_at: now });
  }
}

type PushSubscriptionLike = {
  endpoint: string;
  getKey(name: "p256dh" | "auth"): ArrayBuffer | null;
};

/**
 * Subscribe the current device and persist the subscription for the session
 * user. Returns the stored row id. Call only after notification permission is
 * granted (the prompt itself must originate from a user gesture).
 */
export async function subscribeToPush(
  db: SyncDatabase,
  userId: string,
  vapidPublicKey: string,
): Promise<string | null> {
  const reg = await navigator.serviceWorker.ready;
  let sub: PushSubscriptionLike | null = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });
  }
  return persistSubscription(db, userId, {
    endpoint: sub.endpoint,
    keys: {
      p256dh: b64url(sub.getKey("p256dh")!),
      auth: b64url(sub.getKey("auth")!),
    },
  });
}

/**
 * Unsubscribe the current device (browser-level) and tombstone its rows.
 */
export async function unsubscribeFromPush(db: SyncDatabase): Promise<void> {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
  await tombstoneSubscriptions(db);
}
