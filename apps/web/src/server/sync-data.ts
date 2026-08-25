/**
 * Delta-pull helper for the custom sync.
 *
 * Lives outside the route module so Next.js route typing (HTTP methods only)
 * and vitest (which imports fetchDeltas directly) can both use it.
 */
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { TABLE_REGISTRY } from "@/server/table-registry";
import { serializeRow } from "@/server/sync-serialize";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

const FULL_SNAPSHOT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export type DeltaResult = {
  since: number;
  rows: Array<{ table: string; row: Record<string, unknown> }>;
};

export async function fetchDeltas(
  userId: string,
  since: number | null
): Promise<DeltaResult> {
  const db = getDb();
  const rows: DeltaResult["rows"] = [];
  let maxUpdatedAt = since ?? 0;

  const useSince =
    since != null && Date.now() - since <= FULL_SNAPSHOT_WINDOW_MS;

  for (const [tableName, config] of Object.entries(TABLE_REGISTRY)) {
    const table = config.table as unknown as AnyPgTable & {
      userId: AnyPgColumn;
      updatedAt: AnyPgColumn;
    };

    const conditions = [eq(table.userId, userId)];
    if (useSince) {
      conditions.push(gt(table.updatedAt, new Date(since!)));
    }

    const result = await db
      .select()
      .from(table)
      .where(useSince ? and(...conditions) : conditions[0]);

    for (const row of result) {
      const snakeRow = serializeRow(row as Record<string, unknown>, config.camelToSnake);
      rows.push({ table: tableName, row: snakeRow });
      const updatedAt = (row as { updatedAt: Date }).updatedAt?.getTime();
      if (updatedAt && updatedAt > maxUpdatedAt) {
        maxUpdatedAt = updatedAt;
      }
    }
  }

  if (maxUpdatedAt === 0) {
    maxUpdatedAt = since ?? Date.now();
  }

  return { since: maxUpdatedAt, rows };
}
