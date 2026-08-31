"use client";

import { useEffect, useRef } from "react";
import { onRemoteWipe } from "./store.js";
import { useSyncStore } from "./sync-store.js";
import { useSession } from "@/lib/auth-client";

/**
 * Thin lifecycle wrapper. Creates the engine on first render and manages
 * start/stop based on the session. Consumers read from useSyncStore directly.
 *
 * cavetail: this used to be a full context provider. The state now lives in a
 * Zustand store (sync-store.ts) so consumers use granular selectors. This
 * component only handles the React lifecycle side effects that cannot live in a
 * module-level singleton (session hooks, effect cleanup).
 */
export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;

  const init = useSyncStore((s) => s._init);
  const engine = useSyncStore((s) => s._engine);
  const setSyncStatus = useSyncStore((s) => s._setSyncStatus);
  const setUserId = useSyncStore((s) => s.setUserId);

  const userIdRef = useRef(userId);
  userIdRef.current = userId;


  useEffect(() => {
    init(() => userIdRef.current);
  }, [init]);

  useEffect(() => {
    setUserId(userId);
  }, [userId, setUserId]);

  useEffect(() => {
    if (!engine) return;
    const unsub = engine.onStateChange((s) => setSyncStatus(s));
    return () => unsub();
  }, [engine, setSyncStatus]);

  useEffect(() => {
    if (!engine) return;
    return onRemoteWipe(() => engine.stop());
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    const confirmedSignOut =
      !isPending &&
      (session as { error?: { status?: number } | null } | null)?.error
        ?.status === 401;
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

  return <>{children}</>;
};

export function useSync() {
  const db = useSyncStore((s) => s.db);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const isReady = useSyncStore((s) => s.isReady);
  const userId = useSyncStore((s) => s.userId);
  return { db, syncStatus, isReady, userId };
}
