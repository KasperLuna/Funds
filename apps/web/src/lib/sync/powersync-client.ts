import { PowerSyncDatabase, UpdateType } from "@powersync/web";
import type { QueryResult as PowerSyncQueryResult } from "@powersync/web";
import type {
  QueryParams,
  QueryResult,
  RowRecord,
  SyncDatabase,
  SyncTable,
} from "./types.js";
import { appSchema } from "./schema.js";
import { normalizeRows, normalizeRow, upsertRow } from "./normalize.js";
import { trpc } from "@/lib/trpc/client";

/**
 * Real PowerSync-backed {@link SyncDatabase} facade.
 *
 * cavetail: BROWSER-ONLY — PowerSync's web client is backed by OPFS SQLite via a
 * worker and CANNOT run under node/vitest. Construction guards for a browser
 * context and throws a descriptive error otherwise. Real behavior is verified at
 * the P4 spike / Playwright, not in unit tests. Tests use the in-memory impl.
 *
 * Wire contract (architecture.md §1, §4):
 *  - Reads go through PowerSync's client-side views; the local schema is the
 *    source of truth and jsonb/timestamp columns are normalized to app shapes.
 *  - Writes land locally and are captured by PowerSync triggers into the upload
 *    queue, drained by `uploadData` into the auth-gated tRPC applyMutations
 *    endpoint, which upserts into Postgres and replicates back.
 */
export function createPowerSyncClient(): SyncDatabase & {
  connect(): Promise<void>;
  db: PowerSyncDatabase;
} {
  let connected = false;

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

  const db = new PowerSyncDatabase({
    schema: appSchema,
    database: { dbFilename: "funds.db" },
  });

  /**
   * Drain the local CRUD queue into the server.
   *
   * PowerSync captures every local write into the upload queue. We replay each
   * entry against the current local row (so the payload is a full, normalized
   * row the server can compare and upsert idempotently), batch by table, and
   * only mark the batch complete after the server acknowledges.
   */
  async function uploadData(database: PowerSyncDatabase): Promise<void> {
    let batch = await database.getCrudBatch();
    while (batch) {
      const byTable = new Map<string, { upserts: RowRecord[]; deletes: RowRecord[] }>();
      for (const entry of batch.crud) {
        const table = entry.table;
        const slot = byTable.get(table) ?? { upserts: [], deletes: [] };
        byTable.set(table, slot);

        if (entry.op === UpdateType.DELETE) {
          slot.deletes.push({ id: entry.id, ...(entry.opData as RowRecord) });
          continue;
        }

        // Re-read the full local row so the server sees the complete state,
        // including user_id / created_at / updated_at, for conflict resolution.
        const full = await database.getOptional<RowRecord>(
          `SELECT * FROM ${table} WHERE id = ?`,
          [entry.id],
        );
        if (full) slot.upserts.push(normalizeRow(table, full));
      }

      const batches = [...byTable.entries()].map(([table, { upserts, deletes }]) => ({
        table,
        upserts,
        deletes,
      }));

      if (batches.some((b) => b.upserts.length > 0 || b.deletes.length > 0)) {
        await trpc.applyMutations.mutate({ batches });
      }

      await batch.complete();
      batch = await database.getCrudBatch();
    }
  }

  function table(name: string): SyncTable {
    return {
      upsert: (row) => upsertRow(exec, query, name, row),
      update: async (row) => {
        const id = String(row.id);
        const data = normalizeRow(name, row);
        const cols = Object.keys(data).filter((c) => c !== "id");
        const set = cols.map((c) => `${c} = ?`).join(", ");
        const params = [...cols.map((c) => data[c]), id];
        await exec(`UPDATE ${name} SET ${set} WHERE id = ?`, params);
      },
      deleteById: async (id) => {
        await exec(`DELETE FROM ${name} WHERE id = ?`, [String(id)]);
      },
    };
  }

  const exec = async (
    sql: string,
    params?: QueryParams,
  ): Promise<QueryResult> => {
    return normalize(await db.execute(sql, params as never), sql);
  };

  const query = async (sql: string, params?: QueryParams): Promise<QueryResult> => {
    return normalize(await db.execute(sql, params as never), sql);
  };

  const facade: SyncDatabase = {
    get isConnected(): boolean {
      return connected;
    },

    execute: exec,
    query,

    table,

    async *watch(sql: string, params?: QueryParams): AsyncIterable<QueryResult> {
      const handlers: Array<(result: QueryResult) => void> = [];
      db.watch(sql, (params ?? []) as never, {
        onResult: (raw) => {
          const normalized = normalize(raw as never, sql);
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
    connect: async (): Promise<void> => {
      await db.connect({
        fetchCredentials: async () => {
          const base = `${window.location.origin}`;
          const res = await fetch(`${base}/api/sync/token`);
          if (!res.ok) return null;
          const { token, endpoint } = (await res.json()) as {
            token: string;
            endpoint: string;
          };
          return { endpoint, token };
        },
        uploadData,
      });
      connected = true;
    },
  };
}

function tableFromSql(sql: string): string | undefined {
  const match = /FROM\s+([A-Za-z_][\w]*)/i.exec(sql);
  return match?.[1];
}

function normalize(raw: PowerSyncQueryResult, sql?: string): QueryResult {
  const rows: RowRecord[] = (raw.rows?._array as RowRecord[] | undefined) ?? [];
  const table = sql ? tableFromSql(sql) : undefined;
  return {
    rows: table ? normalizeRows(table, rows) : rows,
    rowsAffected: raw.rowsAffected ?? rows.length,
    lastInsertId: raw.insertId != null ? String(raw.insertId) : undefined,
  };
}
