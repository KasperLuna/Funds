import { createPowerSyncClient } from "./powersync-client.js";
import type { SyncDatabase } from "./types.js";

export type {
  RowRecord,
  QueryResult,
  QueryParams,
  SyncTable,
  SyncDatabase,
} from "./types.js";

export { MemorySyncDatabase } from "./memory-sync.js";
export { createPowerSyncClient } from "./powersync-client.js";

/**
 * Factory returning the app's default {@link SyncDatabase}.
 *
 * cavetail: production uses the real PowerSync client (browser/OPFS). The
 * in-memory impl is reserved for tests and local dev; swap the factory's return
 * here or in consumers without touching call sites.
 */
export function createSyncDatabase(): SyncDatabase {
  return createPowerSyncClient();
}
