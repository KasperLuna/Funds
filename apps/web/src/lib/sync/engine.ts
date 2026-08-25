import { ENTITY_TABLES, type DexieStore } from "./store.js";
import { trpc } from "@/lib/trpc/client";
import { denormalizeRow } from "./normalize.js";

type RowRecord = Record<string, unknown>;

export type Batch = { table: string; upserts: RowRecord[]; deletes: RowRecord[] };

type OutboxEntry = {
  key: string;
  table: string;
  id: string;
  op: "upsert" | "delete";
  row: RowRecord;
  createdAt: number;
  failed?: boolean;
};

/**
 * Deterministic parent-first order for push batches. The server re-sorts by its
 * own priority anyway, but keeping client order stable makes tests and logs
 * predictable.
 */
const TABLE_PRIORITY: Record<string, number> = {
  accounts: 0,
  categories: 1,
  category_budgets: 2,
  tokens: 3,
  templates: 4,
  scheduled_transactions: 5,
  push_subscriptions: 6,
  transfers: 7,
  trades: 8,
  transactions: 9,
  token_transactions: 10,
};

export type SyncEngineState = {
  online: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  failedCount: number;
};

export type SyncEngine = {
  start(): void;
  stop(): void;
  syncNow(): Promise<void>;
  setOnline(on: boolean): void;
  getState(): SyncEngineState;
  wipe(): Promise<void>;
  onStateChange(cb: (s: SyncEngineState) => void): () => void;
};

type EngineOptions = {
  store: DexieStore;
  fetch?: typeof fetch;
  getUserId: () => string | null;
  push?: (batches: Batch[]) => Promise<unknown>;
};

const PULL_ENDPOINT = "/api/sync/data";

// cavetail: HTTP 4xx and explicit permanent markers are non-retryable; treat
// everything else (network drop, 5xx) as transient and back off.
function isPermanentError(e: unknown): boolean {
  const err = e as { status?: unknown; permanent?: unknown };
  if (typeof err.status === "number" && err.status >= 400 && err.status < 500) return true;
  return err.permanent === true;
}

export function createSyncEngine(options: EngineOptions): SyncEngine {
  const { store, getUserId } = options;
  const fetchFn = options.fetch ?? globalThis.fetch;
  const pushFn =
    options.push ?? ((batches: Batch[]) => trpc.applyMutations.mutate({ batches }));

  let started = false;
  let applyingPull = false;
  let visible = true;
  let backoffCount = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let inFlight: Promise<void> | null = null;
  const unsubscribes: Array<() => void> = [];

  let state: SyncEngineState = {
    online: true,
    syncing: false,
    lastSyncedAt: null,
    failedCount: 0,
  };
  const listeners = new Set<(s: SyncEngineState) => void>();

  function setState(partial: Partial<SyncEngineState>): void {
    state = { ...state, ...partial };
    for (const cb of listeners) cb(state);
  }

  function watermarkKey(userId: string): string {
    return `watermark:${userId}`;
  }

  async function getWatermark(userId: string): Promise<number | null> {
    const rec = await store.db.table("_meta").get(watermarkKey(userId));
    return (rec?.value as number | undefined) ?? null;
  }

  async function setWatermark(userId: string, value: number): Promise<void> {
    await store.db.table("_meta").put({ key: watermarkKey(userId), value });
  }

  function enqueue(table: string, id: string, op: "upsert" | "delete", row: RowRecord): void {
    const entry = { key: `${table}:${id}`, table, id, op, row, createdAt: Date.now() };
    // cavetail: a hook runs inside the triggering write's transaction, which
    // only covers the entity table — writing `_outbox` there throws
    // NotFoundError. Defer so the outbox write opens its own transaction after
    // the hook's transaction commits.
    setTimeout(() => {
      void store.db.table("_outbox").put(entry);
    }, 0);
  }

  function attachHooks(): void {
    for (const table of ENTITY_TABLES) {
      const t = store.db.table(table);
      const onCreating = (primKey: unknown, obj: unknown): void => {
        if (!applyingPull) enqueue(table, String(primKey), "upsert", obj as RowRecord);
      };
      const onUpdating = (modifications: unknown, primKey: unknown, obj: unknown): void => {
        if (!applyingPull) {
          enqueue(table, String(primKey), "upsert", {
            ...(obj as RowRecord),
            ...(modifications as RowRecord),
          });
        }
      };
      const onDeleting = (primKey: unknown, obj: unknown): void => {
        if (!applyingPull) enqueue(table, String(primKey), "delete", obj as RowRecord);
      };
      t.hook("creating").subscribe(onCreating);
      t.hook("updating").subscribe(onUpdating);
      t.hook("deleting").subscribe(onDeleting);
      unsubscribes.push(() => {
        t.hook("creating").unsubscribe(onCreating);
        t.hook("updating").unsubscribe(onUpdating);
        t.hook("deleting").unsubscribe(onDeleting);
      });
    }
  }

  function detachHooks(): void {
    for (const unsub of unsubscribes) unsub();
    unsubscribes.length = 0;
  }

  async function flushPush(): Promise<void> {
    const pending = (await store.db.table("_outbox").toArray()) as OutboxEntry[];
    const active = pending.filter((e) => !e.failed);
    if (active.length === 0) return;

    const byTable = new Map<string, { upserts: RowRecord[]; deletes: RowRecord[] }>();
    for (const entry of active) {
      const slot = byTable.get(entry.table) ?? { upserts: [], deletes: [] };
      if (entry.op === "delete") {
        slot.deletes.push(entry.row);
      } else {
        // Re-read the full current row so the server sees complete state
        // (created_at / updated_at / user_id) for idempotent conflict resolution.
        const full = await store.db.table(entry.table).get(entry.id);
        if (full) slot.upserts.push(full as RowRecord);
      }
      byTable.set(entry.table, slot);
    }

    const batches: Batch[] = [...byTable.entries()]
      .map(([table, { upserts, deletes }]) => ({ table, upserts, deletes }))
      .sort((a, b) => (TABLE_PRIORITY[a.table] ?? 50) - (TABLE_PRIORITY[b.table] ?? 50));

    if (!batches.some((b) => b.upserts.length > 0 || b.deletes.length > 0)) {
      await store.db.table("_outbox").bulkDelete(active.map((e) => e.key));
      return;
    }

    try {
      await pushFn(batches);
    } catch (err) {
      if (isPermanentError(err)) {
        for (const e of active) {
          await store.db.table("_outbox").update(e.key, { failed: true });
        }
        setState({ failedCount: state.failedCount + 1 });
        return;
      }
      throw err;
    }

    await store.db.table("_outbox").bulkDelete(active.map((e) => e.key));
  }

  async function pull(): Promise<void> {
    const userId = getUserId();
    if (!userId) return;
    const watermark = await getWatermark(userId);
    const url =
      watermark != null ? `${PULL_ENDPOINT}?since=${watermark}` : PULL_ENDPOINT;
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`pull failed: ${res.status}`);
    const data = (await res.json()) as {
      since: number;
      rows: Array<{ table: string; row: RowRecord }>;
    };

    // Guard: pull writes go straight to the Dexie table so the hooks do not
    // re-enqueue pulled rows back into the outbox. Apply ALL rows before
    // persisting the watermark so a crash mid-apply re-pulls instead of losing
    // rows.
    applyingPull = true;
    try {
      for (const { table, row } of data.rows) {
        await store.db.table(table).put(denormalizeRow(table, row));
      }
    } finally {
      applyingPull = false;
    }
    await setWatermark(userId, data.since);
  }

  function resetBackoff(): void {
    backoffCount = 0;
  }
  function backoff(): void {
    backoffCount++;
  }
  function intervalDelay(): number {
    return Math.min(30_000, 1000 * 2 ** backoffCount);
  }

  function scheduleTick(): void {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (state.online && visible) void syncNow();
      scheduleTick();
    }, intervalDelay());
  }

  async function doSync(): Promise<void> {
    const userId = getUserId();
    if (!userId) return;
    if (!state.online) {
      setState({ online: false });
      return;
    }
    if (state.syncing) return;
    setState({ syncing: true });
    try {
      await flushPush();
      await pull();
      resetBackoff();
      setState({ online: true, lastSyncedAt: Date.now() });
    } catch {
      backoff();
      setState({ online: false });
    } finally {
      setState({ syncing: false });
    }
  }

  function syncNow(): Promise<void> {
    if (inFlight) return inFlight;
    inFlight = doSync().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  function setOnline(on: boolean): void {
    setState({ online: on });
    if (on) void syncNow();
  }

  const onOnline = (): void => setOnline(true);
  const onOffline = (): void => setOnline(false);
  const onVisibility = (): void => {
    visible = !document.hidden;
    if (visible && state.online) void syncNow();
  };
  const onPageshow = (): void => {
    visible = true;
    if (state.online) void syncNow();
  };

  function start(): void {
    if (started) return;
    if (!getUserId()) return;
    started = true;
    attachHooks();
    visible = typeof document !== "undefined" ? !document.hidden : true;
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pageshow", onPageshow);
    document.addEventListener("visibilitychange", onVisibility);
    scheduleTick();
    void syncNow();
  }

  function stop(): void {
    if (!started) return;
    started = false;
    detachHooks();
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("pageshow", onPageshow);
    document.removeEventListener("visibilitychange", onVisibility);
  }

  async function wipe(): Promise<void> {
    // cavetail: store.wipe() clears entity tables with clear(), which fires the
    // deleting hook per row — guard so it does not re-enqueue tombstone deletes
    // into the freshly-cleared outbox.
    applyingPull = true;
    try {
      await store.wipe();
    } finally {
      applyingPull = false;
    }
    resetBackoff();
    setState({ online: state.online, syncing: false, lastSyncedAt: null, failedCount: 0 });
  }

  function getState(): SyncEngineState {
    return { ...state };
  }

  function onStateChange(cb: (s: SyncEngineState) => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  return { start, stop, syncNow, setOnline, getState, wipe, onStateChange };
}
