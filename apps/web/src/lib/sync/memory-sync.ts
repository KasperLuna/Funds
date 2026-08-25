import type {
  QueryParams,
  QueryResult,
  RowRecord,
  SyncDatabase,
  SyncTable,
} from "./types.js";
import { denormalizeRow, normalizeRows, upsertRow } from "./normalize.js";
import { filterRows, parseSelect, projectRows, sortRows } from "./sql.js";
import { PushChannel } from "./push-channel.js";

/**
 * In-memory {@link SyncDatabase} for tests and local/dev use.
 *
 * cavetail: The SQL parser is intentionally MINIMAL — it understands only the
 * statement shapes the sync layer needs. It is NOT a general SQL engine. Keep it
 * this way; extend only when a new consumer actually requires another shape.
 * Supported shapes:
 *   - `INSERT INTO t (cols) VALUES (?,?,...) [ON CONFLICT ...]` (upsert)
 *   - `UPDATE t SET col = ?, ... WHERE id = ?`
 *   - `DELETE FROM t WHERE id = ?`
 *   - `SELECT [* | id] FROM t [WHERE ...] [ORDER BY col ASC|DESC]`
 *
 * Money columns are stored as BigInt (in-memory BigInt is fine) and normalized
 * back to BigInt on every read; `table().upsert` writes via the shared
 * `upsertRow`/`denormalizeRow` path (string-encoded at the write boundary).
 */

type TableMap = Map<string, RowRecord>;

const REGEX = {
  insert:
    /^INSERT\s+INTO\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/i,
  update: /^UPDATE\s+([A-Za-z_][\w]*)\s+SET\s+(.+)\s+WHERE\s+id\s*=\s*\?/i,
  delete: /^DELETE\s+FROM\s+([A-Za-z_][\w]*)\s+WHERE\s+id\s*=\s*\?/i,
  columnName: /^[A-Za-z_][\w]*$/,
  valueRef: /^\?$/,
} as const;

type WatchEntry = {
  table: string;
  sql: string;
  params?: QueryParams;
  push: (value: QueryResult) => void;
};

export class MemorySyncDatabase implements SyncDatabase {
  private tables = new Map<string, TableMap>();
  private connected = false;
  private watchers: WatchEntry[] = [];

  get isConnected(): boolean {
    return this.connected;
  }

  connect(): void {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async execute(sql: string, params: QueryParams = []): Promise<QueryResult> {
    const trimmed = sql.trimStart();
    let table: string;
    let result: QueryResult;

    if (/^INSERT/i.test(trimmed)) {
      const match = REGEX.insert.exec(trimmed);
      if (!match) throw new Error(`Unsupported INSERT: ${sql}`);
      table = match[1] as string;
      const columns = match[2] as string;
      const placeholders = match[3] as string;
      const colNames = columns.split(",").map((c) => c.trim());
      const phNames = placeholders.split(",").map((c) => c.trim());
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
      const id = String(row["id"]);
      const tableMap = this.tableMap(table);
      const existing = tableMap.get(id);
      // cavetail: upsert ON CONFLICT merges — overwrite provided columns, keep the rest.
      tableMap.set(id, existing ? { ...existing, ...row } : { ...row });
      result = { rows: [], rowsAffected: 1, lastInsertId: id };
    } else if (/^UPDATE/i.test(trimmed)) {
      const match = REGEX.update.exec(trimmed);
      if (!match) throw new Error(`Unsupported UPDATE: ${sql}`);
      table = match[1] as string;
      const setClause = match[2] as string;
      const pairs = setClause.split(",").map((p) => {
        const parts = p.trim().split(/\s*=\s*/);
        return { col: parts[0]?.trim(), value: parts[1]?.trim() };
      });
      const id = String(params[params.length - 1]);
      const tableMap = this.tableMap(table);
      const row = tableMap.get(id);
      if (row) {
        pairs.forEach((pair, i) => {
          if (!pair.col || !pair.value) {
            throw new Error(`Unsupported UPDATE shape: ${sql}`);
          }
          if (!REGEX.columnName.test(pair.col) || !REGEX.valueRef.test(pair.value)) {
            throw new Error(`Unsupported UPDATE shape: ${sql}`);
          }
          row[pair.col] = params[i];
        });
        tableMap.set(id, { ...row });
      }
      result = { rows: [], rowsAffected: row ? 1 : 0 };
    } else if (/^DELETE/i.test(trimmed)) {
      const match = REGEX.delete.exec(trimmed);
      if (!match) throw new Error(`Unsupported DELETE: ${sql}`);
      table = match[1] as string;
      const id = String(params[0]);
      result = { rows: [], rowsAffected: this.tableMap(table).delete(id) ? 1 : 0 };
    } else {
      throw new Error(`Unsupported statement: ${sql}`);
    }

    this.emitChange(table);
    return result;
  }

  async query(sql: string, params: QueryParams = []): Promise<QueryResult> {
    const parsed = parseSelect(sql);
    const tableMap = this.tables.get(parsed.table) ?? new Map<string, RowRecord>();
    const rows = projectRows(
      sortRows(
        filterRows([...tableMap.values()], parsed.where, params),
        parsed.orderBy,
      ),
      parsed.columns,
    );
    return { rows: normalizeRows(parsed.table, rows), rowsAffected: rows.length };
  }

  async *watch(sql: string, params: QueryParams = []): AsyncIterable<QueryResult> {
    const parsed = parseSelect(sql);
    if (parsed.columns !== "*") throw new Error(`Unsupported SELECT in watch: ${sql}`);

    const channel = new PushChannel<QueryResult>();
    const entry: WatchEntry = {
      table: parsed.table,
      sql,
      params,
      push: (value) => channel.push(value),
    };
    this.watchers.push(entry);

    try {
      while (true) {
        const next = await channel.next();
        if (next.done) return;
        yield next.value;
      }
    } finally {
      this.watchers = this.watchers.filter((w) => w !== entry);
    }
  }

  /**
   * SyncTable facade bound to a table name.
   */
  table(name: string): SyncTable {
    return {
      upsert: async (row) => {
        await upsertRow(
          (sql, params) => this.execute(sql, params),
          (sql, params) => this.query(sql, params),
          name,
          row,
        );
      },
      update: async (row) => {
        const data = denormalizeRow(name, row);
        const columns = Object.keys(data).filter((c) => c !== "id");
        const set = columns.map((c) => `${c} = ?`).join(", ");
        const values = [...columns.map((c) => data[c]), row["id"]];
        await this.execute(`UPDATE ${name} SET ${set} WHERE id = ?`, values);
      },
      deleteById: async (id) => {
        await this.execute(`DELETE FROM ${name} WHERE id = ?`, [id]);
      },
    };
  }

  private tableMap(name: string): TableMap {
    let map = this.tables.get(name);
    if (!map) {
      map = new Map<string, RowRecord>();
      this.tables.set(name, map);
    }
    return map;
  }

  private emitChange(table: string): void {
    for (const watcher of this.watchers) {
      if (watcher.table === table) {
        void this.query(watcher.sql, watcher.params).then((result) => watcher.push(result));
      }
    }
  }
}