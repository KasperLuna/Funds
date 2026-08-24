"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MemorySyncDatabase } from "./memory-sync.js";
import type { SyncDatabase } from "./types.js";
import { useSession } from "@/lib/auth-client";

type SyncContextValue = {
  db: SyncDatabase;
  isConnected: boolean;
  /**
   * True when the data source is settled and safe to query for authoritative
   * data: PowerSync connected, OR sync is off (session resolved signed-out, so
   * the local memory db is the source of truth). Pages gate their initial
   * loads + empty-state rendering on this so they don't flash a false "0 /
   * empty" state while PowerSync swaps in asynchronously.
   */
  isReady: boolean;
  /**
   * Epoch ms of the last fully-completed sync checkpoint, null until one lands.
   * Changes on EVERY checkpoint delivery — including the first login and user
   * switches — so pages can reload freshly-downloaded data.
   */
  lastSyncedAt: number | null;
  /** Authenticated user id used to stamp rows for sync; null until session loads. */
  userId: string | null;
};

export const SyncContext = createContext<SyncContextValue>({
  db: new MemorySyncDatabase(),
  isConnected: false,
  isReady: false,
  lastSyncedAt: null,
  userId: null,
});

type PowerSyncClient = Awaited<
  ReturnType<typeof import("./powersync-client.js")["createPowerSyncClient"]>
>;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;

  const [db] = useState<SyncDatabase>(() => {
    const d = new MemorySyncDatabase();
    d.connect();
    return d;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  // cavetail: signed-in + server down keeps isConnected false forever → pages
  // would load indefinitely. Fall back to ready after a window so the app
  // still renders (local db) instead of hanging on a spinner. Ceiling: nothing
  // syncs while offline anyway; upgrade path: surface a real offline state.
  const [fellBackReady, setFellBackReady] = useState(false);
  const clientRef = useRef<PowerSyncClient | null>(null);

  // Only attempt remote sync once the session has fully loaded AND the user is
  // signed in. PowerSync needs a valid session to mint a token; connecting
  // before /get-session resolves (or signed-out) only produces console spam.
  const canSync = !!userId && !isPending;

  // Safe to query authoritative data: connected, or sync off (signed out →
  // local memory db), or timed out waiting for a connect (server down).
  const isReady = isConnected || (!isPending && !userId) || fellBackReady;

  useEffect(() => {
    if (isReady) return;
    const t = setTimeout(() => setFellBackReady(true), 3000);
    return () => clearTimeout(t);
  }, [isReady]);

  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    let retryCount = 0;

    // Suppress uncatchable NetworkError TypeError from PowerSync HTTP fetch when server is down
    const onErr = (e: Event) => {
      const msg = (e as ErrorEvent)?.message ?? "";
      if (typeof msg === "string" && msg.includes("NetworkError")) e.preventDefault();
    };

    async function tryConnect() {
      if (cancelled) return;
      let client: PowerSyncClient | null = null;
      try {
        const { createPowerSyncClient } = await import("./powersync-client.js");
        client = createPowerSyncClient();
        window.addEventListener("error", onErr);
        try {
          await client.connect();
        } finally {
          window.removeEventListener("error", onErr);
        }
        if (cancelled) {
          void client.disconnect();
          return;
        }
        // Replace the memory db methods with power sync methods.
        // MemorySyncDatabase's `isConnected` is getter-only, so Object.assign
        // would throw; define the property explicitly instead.
        Object.assign(db, {
          execute: client.execute.bind(client),
          query: client.query.bind(client),
          watch: client.watch.bind(client),
          table: client.table.bind(client),
          disconnect: client.disconnect.bind(client),
        });
        const c = client;
        Object.defineProperty(db, "isConnected", {
          configurable: true,
          get() { return c.db.connected || c.db.connecting || c.db.currentStatus?.connected === true; },
        });
        clientRef.current = client;
        retryCount = 0;
        setIsConnected(true);

        // First-login / user-switch race: PowerSync populates the local DB
        // *asynchronously* after connect() resolves (and a shared OPFS db can
        // report a stale hasSynced from a previous account), so pages that
        // load on `isConnected` alone would query stale/empty data until a
        // manual refresh. Signal on every completed checkpoint instead: when
        // lastSyncedAt changes, pages reload freshly-downloaded data.
        let prev: number | null = c.db.currentStatus?.lastSyncedAt?.getTime() ?? null;
        const iv = setInterval(() => {
          if (cancelled) {
            clearInterval(iv);
            return;
          }
          const cur = c.db.currentStatus?.lastSyncedAt?.getTime() ?? null;
          if (cur !== prev) {
            prev = cur;
            if (cur != null) setLastSyncedAt(cur);
          }
        }, 200);
      } catch {
        // PowerSync unavailable, or a transient connect failure such as the
        // shared worker's "Could not open DB connection since no client is
        // connected." race. Disconnect the orphaned client so its stream stops
        // logging that error on every retry, then retry with backoff.
        if (client && clientRef.current !== client) void client.disconnect();
        if (cancelled) return;
        const delay = Math.min(2000 * 2 ** retryCount, 30_000);
        retryCount++;
        setTimeout(() => void tryConnect(), delay);
      }
    }
    void tryConnect();
    return () => {
      cancelled = true;
      const c = clientRef.current;
      if (c) {
        clientRef.current = null;
        void c.disconnect();
      }
    };
  }, [db, canSync]);

  const value = useMemo(
    () => ({ db, isConnected, isReady, lastSyncedAt, userId }),
    [db, isConnected, isReady, lastSyncedAt, userId],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}
