"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MemorySyncDatabase } from "./memory-sync.js";
import type { SyncDatabase } from "./types.js";
import { useSession } from "@/lib/auth-client";

type SyncContextValue = {
  db: SyncDatabase;
  isConnected: boolean;
  /** Authenticated user id used to stamp rows for sync; null until session loads. */
  userId: string | null;
};

const SyncContext = createContext<SyncContextValue>({
  db: new MemorySyncDatabase(),
  isConnected: false,
  userId: null,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [db] = useState<SyncDatabase>(() => {
    const d = new MemorySyncDatabase();
    d.connect();
    return d;
  });
  const [isConnected, setIsConnected] = useState(false);

  // Only attempt remote sync when signed in. PowerSync needs a valid session to
  // mint a token; connecting signed-out only produces 401 console spam.
  const canSync = !!userId;

  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    async function tryConnect() {
      try {
        const { createPowerSyncClient } = await import("./powersync-client.js");
        const client = createPowerSyncClient();
        // Suppress uncatchable NetworkError TypeError from PowerSync HTTP fetch when server is down
        const onErr = (e: Event) => {
          const msg = (e as ErrorEvent)?.message ?? "";
          if (typeof msg === "string" && msg.includes("NetworkError")) e.preventDefault();
        };
        window.addEventListener("error", onErr);
        try {
          await client.connect();
          window.removeEventListener("error", onErr);
        } catch {
          window.removeEventListener("error", onErr);
          return;
        }
        if (!cancelled) {
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
          Object.defineProperty(db, "isConnected", {
            configurable: true,
            get() { return client.db.connected || client.db.connecting || client.db.currentStatus?.connected === true; },
          });
          setIsConnected(true);
        }
      } catch {
        // PowerSync not available — stay with MemorySyncDatabase
      }
    }
    void tryConnect();
    return () => { cancelled = true; };
  }, [db, canSync]);

  const value = useMemo(
    () => ({ db, isConnected, userId }),
    [db, isConnected, userId],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}
