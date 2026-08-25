import type { QueryParams, RowRecord } from "./types.js";

/**
 * Minimal SELECT translator shared by every SyncDatabase backend.
 *
 * cavetail: The parser is intentionally MINIMAL — it understands only the
 * statement shapes the sync layer needs. It is NOT a general SQL engine.
 * Supported shapes:
 *   - `SELECT * FROM t`
 *   - `SELECT * FROM t WHERE col = ? [AND col IS NULL | col IS NOT NULL | col = <int> ...]`
 *   - `SELECT * FROM t WHERE ... ORDER BY col ASC|DESC`
 *   - `SELECT id FROM t WHERE id = ?` (upsert existence probe)
 */

export type SelectOrderBy = { column: string; dir: "asc" | "desc" };

export type SelectParse = {
  table: string;
  columns: "*" | string[];
  where: string | undefined;
  orderBy: SelectOrderBy | undefined;
};

const SELECT_RE =
  /^SELECT\s+(\*|id)\s+FROM\s+([A-Za-z_][\w]*)(?:\s+WHERE\s+(.+))?$/i;
const ORDER_BY_RE = /\s+ORDER\s+BY\s+([A-Za-z_][\w]*)\s+(ASC|DESC)\s*$/i;
const WHERE_NULL_RE = /^([A-Za-z_][\w]*)\s+(IS\s+NOT\s+NULL|IS\s+NULL)$/i;
const WHERE_EQ_RE = /^([A-Za-z_][\w]*)\s*=\s*\?$/;
const WHERE_LIT_RE = /^([A-Za-z_][\w]*)\s*=\s*(-?\d+)$/;

export function parseSelect(sql: string): SelectParse {
  const s = sql.trim();
  const orderMatch = ORDER_BY_RE.exec(s);
  let rest = s;
  let orderBy: SelectOrderBy | undefined;
  if (orderMatch) {
    orderBy = {
      column: orderMatch[1] as string,
      dir: (orderMatch[2] as string).toLowerCase() as SelectOrderBy["dir"],
    };
    rest = s.slice(0, orderMatch.index).trim();
  }
  const match = SELECT_RE.exec(rest);
  if (!match) throw new Error(`Unsupported SELECT: ${sql}`);
  const columns = match[1] as string;
  return {
    table: match[2] as string,
    columns: columns === "*" ? "*" : columns.split(",").map((c) => c.trim()),
    where: match[3],
    orderBy,
  };
}

export function matchWhere(row: RowRecord, where: string, params: QueryParams): boolean {
  const terms = where.split(/\s+AND\s+/i);
  let paramIndex = 0;
  for (const rawTerm of terms) {
    const term = rawTerm.trim();
    const nullMatch = WHERE_NULL_RE.exec(term);
    if (nullMatch) {
      const col = nullMatch[1] as string;
      const op = (nullMatch[2] as string).replace(/\s+/g, " ").toUpperCase();
      const isNull = row[col] === null || row[col] === undefined;
      if (op === "IS NULL" ? !isNull : isNull) return false;
      continue;
    }
    const eqMatch = WHERE_EQ_RE.exec(term);
    if (eqMatch) {
      const col = eqMatch[1] as string;
      if (row[col] !== params[paramIndex]) return false;
      paramIndex++;
      continue;
    }
    const litMatch = WHERE_LIT_RE.exec(term);
    if (litMatch) {
      const col = litMatch[1] as string;
      if (Number(row[col]) !== Number(litMatch[2])) return false;
      continue;
    }
    throw new Error(`Unsupported WHERE term: ${term}`);
  }
  return true;
}

export function filterRows(
  rows: RowRecord[],
  where: string | undefined,
  params: QueryParams,
): RowRecord[] {
  if (where === undefined) return rows;
  return rows.filter((row) => matchWhere(row, where, params));
}

export function projectRows(rows: RowRecord[], columns: "*" | string[]): RowRecord[] {
  if (columns === "*") return rows;
  return rows.map((r) => {
    const out: RowRecord = {};
    for (const c of columns) out[c] = r[c];
    return out;
  });
}

export function sortRows(rows: RowRecord[], orderBy: SelectOrderBy | undefined): RowRecord[] {
  if (!orderBy) return rows;
  const { column, dir } = orderBy;
  return [...rows].sort((a, b) => {
    const av = a[column];
    const bv = b[column];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : 1;
    return dir === "desc" ? -cmp : cmp;
  });
}