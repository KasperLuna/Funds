import { createDexieStore } from "./store.js";
import type { SyncDatabase } from "./types.js";

export type {
  RowRecord,
  QueryResult,
  QueryParams,
  SyncTable,
  SyncDatabase,
} from "./types.js";

export { MemorySyncDatabase } from "./memory-sync.js";
export { createDexieStore } from "./store.js";

/**
 * Factory returning the app's default {@link SyncDatabase}.
 *
 * cavetail: production uses the Dexie (IndexedDB) store. The in-memory impl is
 * reserved for tests and local dev; swap the factory's return here or in
 * consumers without touching call sites.
 */
export function createSyncDatabase(): SyncDatabase {
  return createDexieStore();
}
