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

type SyncContextValue = {
  db: SyncDatabase;
  isConnected: boolean;
};

const SyncContext = createContext<SyncContextValue>({
  db: new MemorySyncDatabase(),
  isConnected: false,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [db] = useState<SyncDatabase>(() => {
    const d = new MemorySyncDatabase();
    d.connect();
    return d;
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function tryConnect() {
      try {
        const { createPowerSyncClient } = await import("./powersync-client.js");
        const client = createPowerSyncClient();
        // Generate a dev JWT token
        const token = btoa(JSON.stringify({ sub: "dev-user", aud: "funds", iat: Date.now() }));
        await client.connect(token);
        if (!cancelled) {
          // Replace the memory db methods with power sync methods
          Object.assign(db, {
            execute: client.execute.bind(client),
            query: client.query.bind(client),
            watch: client.watch.bind(client),
            disconnect: client.disconnect.bind(client),
            get isConnected() { return client.isConnected; },
          });
          setIsConnected(true);
        }
      } catch {
        // PowerSync not available — stay with MemorySyncDatabase
      }
    }
    void tryConnect();
    return () => { cancelled = true; };
  }, [db]);

  const value = useMemo(() => ({ db, isConnected }), [db, isConnected]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}
