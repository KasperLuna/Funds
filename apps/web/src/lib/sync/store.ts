import { Dexie, liveQuery } from "dexie";
import type {
  QueryParams,
  QueryResult,
  RowRecord,
  SyncDatabase,
  SyncTable,
} from "./types.js";
import { denormalizeRow, normalizeRows } from "./normalize.js";
import { PushChannel } from "./push-channel.js";
import { filterRows, parseSelect, projectRows, sortRows } from "./sql.js";

/**
 * Dexie (IndexedDB) backed {@link SyncDatabase} for the browser.
 *
 * cavetail: IndexedDB cannot structured-clone BigInt and JSON numbers lose
 * precision above 2^53, so money is persisted as STRINGS (via
 * {@link denormalizeRow}) and materialized as BigInt at the read boundary (via
 * {@link normalizeRows}). One shared named DB backs every session on the
 * device; it is wiped on sign-out and on account switch ({@link wipeLocalStore}).
 */

export const ENTITY_TABLES = [
  "accounts",
  "categories",
  "category_budgets",
  "transfers",
  "trades",
  "tokens",
  "token_transactions",
  "transactions",
  "templates",
  "scheduled_transactions",
  "push_subscriptions",
] as const;

const INTERNAL_TABLES = ["_outbox", "_meta"] as const;

const STORES_SCHEMA: Record<string, string> = {
  accounts: "id",
  categories: "id",
  category_budgets: "id",
  transfers: "id",
  trades: "id",
  tokens: "id",
  token_transactions: "id",
  transactions: "id",
  templates: "id",
  scheduled_transactions: "id",
  push_subscriptions: "id",
  _outbox: "key",
  _meta: "key",
};

const REGEX = {
  insert:
    /^INSERT\s+INTO\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/i,
  update: /^UPDATE\s+([A-Za-z_][\w]*)\s+SET\s+(.+)\s+WHERE\s+id\s*=\s*\?/i,
  delete: /^DELETE\s+FROM\s+([A-Za-z_][\w]*)\s+WHERE\s+id\s*=\s*\?/i,
  columnName: /^[A-Za-z_][\w]*$/,
  valueRef: /^\?$/,
} as const;

export type DexieStore = SyncDatabase & {
  db: Dexie;
  wipe(): Promise<void>;
  setIsConnected(connected: boolean): void;
};

let wipeChannel: BroadcastChannel | null = null;

function channel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!wipeChannel) wipeChannel = new BroadcastChannel("funds-sync-wipe");
  return wipeChannel;
}

export function broadcastWipe(): void {
  channel()?.postMessage("wiped");
}

export function onRemoteWipe(cb: () => void): () => void {
  const ch = channel();
  if (!ch) return () => {};
  const handler = (): void => cb();
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}

/**
 * Wipes the shared local store from outside any engine/provider (sign-out
 * click handlers). cavetail: a throwaway store instance has no engine hooks
 * attached, so clear() cannot re-enqueue tombstones into the outbox.
 */
export async function wipeLocalStore(name = "funds"): Promise<void> {
  await createDexieStore(name).wipe();
  broadcastWipe();
}

export function createDexieStore(name = "funds"): DexieStore {
  const db = new Dexie(name);
  db.version(1).stores(STORES_SCHEMA);

  let connected = true;

  async function query(sql: string, params: QueryParams = []): Promise<QueryResult> {
    const parsed = parseSelect(sql);
    const rows = (await db.table(parsed.table).toArray()) as RowRecord[];
    const filtered = projectRows(
      sortRows(filterRows(rows, parsed.where, params), parsed.orderBy),
      parsed.columns,
    );
    return { rows: normalizeRows(parsed.table, filtered), rowsAffected: filtered.length };
  }

  return {
    db,
    get isConnected(): boolean {
      return connected;
    },
    setIsConnected(value: boolean): void {
      connected = value;
    },
    async execute(sql: string, params: QueryParams = []): Promise<QueryResult> {
      const trimmed = sql.trimStart();
      if (/^INSERT/i.test(trimmed)) {
        const match = REGEX.insert.exec(trimmed);
        if (!match) throw new Error(`Unsupported INSERT: ${sql}`);
        const table = match[1] as string;
        const colNames = (match[2] as string).split(",").map((c) => c.trim());
        const phNames = (match[3] as string).split(",").map((c) => c.trim());
        const row: RowRecord = {};
        for (let i = 0; i < colNames.length; i++) {
          const col = colNames[i];
          const ph = phNames[i];
          if (col === undefined || ph === undefined) {
            throw new Error(`Unsupported INSERT (arity mismatch): ${sql}`);
          }
          if (!REGEX.columnName.test(col) || !REGEX.valueRef.test(ph)) {
            throw new Error(`Unsupported INSERT shape: ${sql}`);
          }
          row[col] = params[i];
        }
        await db.table(table).put(denormalizeRow(table, row));
        return { rows: [], rowsAffected: 1, lastInsertId: String(row["id"]) };
      }
      if (/^UPDATE/i.test(trimmed)) {
        const match = REGEX.update.exec(trimmed);
        if (!match) throw new Error(`Unsupported UPDATE: ${sql}`);
        const table = match[1] as string;
        const changes: RowRecord = {};
        (match[2] as string)
          .split(",")
          .map((p) => p.trim().split(/\s*=\s*/))
          .forEach((pair, i) => {
            const col = pair[0]?.trim();
            if (!col || !REGEX.columnName.test(col)) {
              throw new Error(`Unsupported UPDATE shape: ${sql}`);
            }
            changes[col] = params[i];
          });
        const id = String(params[params.length - 1]);
        const count = await db.table(table).update(id, denormalizeRow(table, changes));
        return { rows: [], rowsAffected: count };
      }
      if (/^DELETE/i.test(trimmed)) {
        const match = REGEX.delete.exec(trimmed);
        if (!match) throw new Error(`Unsupported DELETE: ${sql}`);
        const id = String(params[0]);
        const existing = await db.table(match[1] as string).get(id);
        if (existing) await db.table(match[1] as string).delete(id);
        return { rows: [], rowsAffected: existing ? 1 : 0 };
      }
      throw new Error(`Unsupported statement: ${sql}`);
    },
    query,
    async *watch(sql: string, params: QueryParams = []): AsyncIterable<QueryResult> {
      const parsed = parseSelect(sql);
      const channel = new PushChannel<QueryResult>();
      const subscription = liveQuery(() => db.table(parsed.table).toArray()).subscribe({
        next: () => {
          void query(sql, params).then((result) => channel.push(result));
        },
        error: () => {
          channel.close();
        },
      });
      try {
        while (true) {
          const next = await channel.next();
          if (next.done) return;
          yield next.value;
        }
      } finally {
        subscription.unsubscribe();
      }
    },
    table(name: string): SyncTable {
      const t = db.table(name);
      return {
        upsert: async (row) => {
          await t.put(denormalizeRow(name, row));
        },
        update: async (row) => {
          const data = denormalizeRow(name, row);
          const { id, ...changes } = data;
          await t.update(id, changes);
        },
        deleteById: async (id) => {
          await t.delete(id);
        },
      };
    },
    async disconnect(): Promise<void> {
      connected = false;
    },
    async wipe(): Promise<void> {
      await Promise.all(
        [...ENTITY_TABLES, ...INTERNAL_TABLES].map((t) => db.table(t).clear()),
      );
    },
  };
}