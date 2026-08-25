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
import { createDexieStore, type DexieStore } from "./store.js";
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
   * True once the session has resolved (signed in or signed out). Local-first
   * store is always available, so pages render local data immediately and sync
   * fills in as checkpoints land — no flash of a false empty state.
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
  const engineRef = useRef<SyncEngine | null>(null);

  const isReady = !isPending;

  useEffect(() => {
    // Per signed-in user we own one store + engine. On sign-in start the
    // engine; on sign-out (or user switch) wipe and restart.
    const prevEngine = engineRef.current;
    if (prevEngine) {
      engineRef.current = null;
      void prevEngine.wipe().finally(() => prevEngine.stop());
    }
    if (!userId) return;

    const engine = createSyncEngine({
      store,
      getUserId: () => userId,
    });
    engineRef.current = engine;
    setSyncStatus(engine.getState());
    const unsub = engine.onStateChange((s) => setSyncStatus(s));
    engine.start();
    return () => {
      unsub();
      if (engineRef.current === engine) engineRef.current = null;
      void engine.wipe().finally(() => engine.stop());
    };
  }, [store, userId]);

  const value = useMemo(
    () => ({ db: store, syncStatus, isReady, userId }),
    [store, syncStatus, isReady, userId],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}
