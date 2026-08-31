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
import { createDexieStore, onRemoteWipe, type DexieStore } from "./store.js";
import { createSyncEngine, type SyncEngine } from "./engine.js";
import type { SyncDatabase } from "./types.js";
import { useSession } from "@/lib/auth-client";

type SyncStatus = {
  online: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  failedCount: number;
};

type SyncContextValue = {
  db: SyncDatabase;
  syncStatus: SyncStatus;
  /**
   * True from the moment the local Dexie store is constructed — it does NOT
   * wait on the session fetch. Every local read keys on `isReady` so data
   * paints from IndexedDB immediately (tap-to-interactive on the PWA's first
   * frame) while the network session + sync fill in behind it.
   *
   * The session gate for *pushing* lives inside the engine (it bails when
   * userId is null), not here. No false empty state, no flash.
   */
  isReady: boolean;
  /** Authenticated user id used to stamp rows for sync; null until session loads. */
  userId: string | null;
};

const DEFAULT_STATUS: SyncStatus = {
  online: false,
  syncing: false,
  lastSyncedAt: null,
  failedCount: 0,
};

export const SyncContext = createContext<SyncContextValue>({
  db: new MemorySyncDatabase(),
  syncStatus: DEFAULT_STATUS,
  isReady: false,
  userId: null,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;

  const [store] = useState<DexieStore>(() => createDexieStore());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(DEFAULT_STATUS);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  // cavetail: one engine per provider instance. Hooks attach at creation so
  // local writes are captured into the outbox even while the session is
  // unresolved (e.g. navigating to the app offline); they are flushed once a
  // user id is known. `start()`/`stop()` only toggle the sync listeners.
  const [engine] = useState<SyncEngine>(() =>
    createSyncEngine({ store, getUserId: () => userIdRef.current }),
  );

  // cavetail: local reads must NOT wait on the session round-trip — on a cold
  // iOS PWA launch that is a full network hop that delays TTI and makes the
  // capture sheet (Plus FAB) appear dead. IndexedDB is available synchronously
  // on mount, so the store is ready immediately; sync push/pull is already
  // gated by userId inside the engine.
  const isReady = true;

  useEffect(() => {
    const unsub = engine.onStateChange((s) => setSyncStatus(s));
    return () => unsub();
  }, [engine]);

  useEffect(() => {
    // Another tab wiped the shared store (sign-out / account switch): stop
    // this tab's engine so a pull cannot resurrect the wiped rows.
    return onRemoteWipe(() => engine.stop());
  }, [engine]);

  useEffect(() => {
    // Only a *definitive* sign-out wipes the store: better-auth resolves a 401
    // (server says no session) with error.status === 401, while an OFFLINE
    // session fetch fails with a network error (no 401) and leaves data null on
    // a fresh load. We must NOT wipe on the latter — the user may be signed in
    // but offline, and the outbox hooks keep capturing writes until they sync.
    const confirmedSignOut = !isPending && (session as { error?: { status?: number } | null } | null)?.error?.status === 401;
    if (confirmedSignOut) {
      void engine.wipe();
      engine.stop();
      return;
    }
    if (userId) {
      engine.start();
    }
    return () => engine.stop();
  }, [engine, userId, isPending, session]);

  const value = useMemo(
    () => ({ db: store, syncStatus, isReady, userId }),
    [store, syncStatus, isReady, userId],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}
