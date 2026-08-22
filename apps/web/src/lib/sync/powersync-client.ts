import { PowerSyncDatabase } from "@powersync/web";
import type { QueryResult as PowerSyncQueryResult } from "@powersync/web";
import type {
  QueryParams,
  QueryResult,
  RowRecord,
  SyncDatabase,
} from "./types.js";
import { appSchema } from "./schema.js";

/**
 * Real PowerSync-backed {@link SyncDatabase} facade.
 *
 * cavetail: BROWSER-ONLY — PowerSync's web client is backed by OPFS SQLite via a
 * worker and CANNOT run under node/vitest. Construction guards for a browser
 * context and throws a descriptive error otherwise. Real behavior is verified at
 * the P4 spike / Playwright, not in unit tests. Tests use the in-memory impl.
 */
export function createPowerSyncClient(): SyncDatabase & {
  connect(token: string): Promise<void>;
  db: PowerSyncDatabase;
} {
  let connected = false;
  let token: string | undefined;

  const g = globalThis as unknown as {
    window?: unknown;
    navigator?: { storage?: unknown };
  };
  const isBrowser = typeof g.window !== "undefined" && !!g.navigator?.storage;

  if (!isBrowser) {
    throw new Error(
      "createPowerSyncClient(): PowerSync requires a browser (OPFS + SharedWorker). " +
        "It cannot run in node/vitest. Use the in-memory SyncDatabase for tests.",
    );
  }

  const endpoint =
    (typeof process !== "undefined" && process.env?.POWERSYNC_ENDPOINT) ||
    "ws://localhost:8080";

  const db = new PowerSyncDatabase({
    schema: appSchema,
    database: { dbFilename: "funds.db" },
  });

  const facade: SyncDatabase = {
    get isConnected(): boolean {
      return connected;
    },

    async execute(sql: string, params?: QueryParams): Promise<QueryResult> {
      return normalize(await db.execute(sql, params as never));
    },

    async query(sql: string, params?: QueryParams): Promise<QueryResult> {
      return normalize(await db.execute(sql, params as never));
    },

    async *watch(sql: string, params?: QueryParams): AsyncIterable<QueryResult> {
      const handlers: Array<(result: QueryResult) => void> = [];
      db.watch(sql, (params ?? []) as never, {
        onResult: (raw) => {
          const normalized = normalize(raw as never);
          const handler = handlers.shift();
          if (handler) handler(normalized);
        },
        onError: (error) => {
          throw error;
        },
      });
      while (true) {
        const result: QueryResult = await new Promise((resolve) => {
          handlers.push(resolve);
        });
        yield result;
      }
    },

    async disconnect(): Promise<void> {
      connected = false;
      await db.disconnect();
    },
  };

  return {
    ...facade,
    db,
    connect: async (nextToken: string): Promise<void> => {
      token = nextToken;
      await db.connect({
        fetchCredentials: async () => ({
          endpoint,
          token: token ?? "",
        }),
        uploadData: async () => {
          // cavetail: upload queue drained at P4 spike.
        },
      });
      connected = true;
    },
  };
}

function normalize(raw: PowerSyncQueryResult): QueryResult {
  const rows: RowRecord[] = (raw.rows?._array as RowRecord[] | undefined) ?? [];
  return {
    rows,
    rowsAffected: raw.rowsAffected ?? rows.length,
    lastInsertId: raw.insertId != null ? String(raw.insertId) : undefined,
  };
}
