import { create } from "zustand";
import { MemorySyncDatabase } from "./memory-sync.js";
import { createDexieStore, type DexieStore } from "./store.js";
import { createSyncEngine, type SyncEngine } from "./engine.js";
import type { SyncDatabase } from "./types.js";

export type SyncStatus = {
  online: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  failedCount: number;
};

const DEFAULT_STATUS: SyncStatus = {
  online: false,
  syncing: false,
  lastSyncedAt: null,
  failedCount: 0,
};

interface SyncState {
  db: SyncDatabase;
  syncStatus: SyncStatus;
  isReady: boolean;
  userId: string | null;
  _engine: SyncEngine | null;
  _store: DexieStore | null;
  _init: (getUserId: () => string | null) => void;
  _setSyncStatus: (s: SyncStatus) => void;
  setUserId: (id: string | null) => void;
  setReady: (v: boolean) => void;
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  db: new MemorySyncDatabase(),
  syncStatus: DEFAULT_STATUS,
  isReady: true,
  userId: null,
  _engine: null,
  _store: null,
  _init: (getUserId) => {
    if (get()._engine) return;
    const dexieStore = createDexieStore();
    const engine = createSyncEngine({ store: dexieStore, getUserId });
    set({ db: dexieStore, _engine: engine, _store: dexieStore });
  },
  _setSyncStatus: (s) => set({ syncStatus: s }),
  setUserId: (id) => set({ userId: id }),
  setReady: (v) => set({ isReady: v }),
}));
