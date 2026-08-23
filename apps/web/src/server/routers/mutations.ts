/**
 * Mutations router: batched idempotent upload endpoint
 */
import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";
import { TABLE_REGISTRY } from "../table-registry.js";
import { resolveMutations, type MutationRow } from "@funds/core";
import { inArray } from "drizzle-orm";

// Input schema
const mutationRowSchema = z.record(z.string(), z.unknown());

const batchSchema = z.object({
  table: z.string(),
  upserts: z.array(mutationRowSchema),
  deletes: z.array(mutationRowSchema),
});

const inputSchema = z.object({
  batches: z.array(batchSchema),
});

/**
 * Convert snake_case row to camelCase for drizzle.
 *
 * Null/empty values are dropped so DB column defaults apply (NOT NULL columns
 * like `archived`/`active` are never violated by a client that omits them) and
 * an upload never wipes a column to NULL it did not intend to change.
 */
function translateSnakeToCamel(
  row: MutationRow,
  mapper: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [snakeKey, val] of Object.entries(row)) {
    const camelKey = mapper[snakeKey];
    if (!camelKey) {
      // Skip unknown fields (forward compatibility)
      continue;
    }
    
    // Drop null/empty so DB defaults apply and NOT NULL columns stay valid
    if (val == null || val === "") {
      continue;
    }
    
    // Convert timestamps from epoch ms to Date (covers *At, *Date, and the
    // few non-conforming names: date, monthStart, timestamp)
    if (
      (camelKey.endsWith("At") ||
        camelKey.endsWith("Date") ||
        camelKey === "date" ||
        camelKey === "monthStart" ||
        camelKey === "timestamp") &&
      typeof val === "number"
    ) {
      result[camelKey] = new Date(val);
    } else if (
      (camelKey.includes("Minor") || camelKey === "openingBalanceMinor") &&
      typeof val === "number"
    ) {
      // Convert numeric amounts to bigint
      result[camelKey] = BigInt(val);
    } else {
      result[camelKey] = val;
    }
  }
  
  return result;
}

/**
 * Convert drizzle row to snake_case MutationRow
 */
function translateCamelToSnake(
  row: Record<string, unknown>,
  mapper: Record<string, string>
): MutationRow {
  const result: Record<string, unknown> = {};
  
  for (const [camelKey, val] of Object.entries(row)) {
    const snakeKey = mapper[camelKey];
    if (!snakeKey) continue;
    
    // Handle null/undefined
    if (val == null) {
      result[snakeKey] = val;
      continue;
    }
    
    // Convert Date to epoch ms
    if (val instanceof Date) {
      result[snakeKey] = val.getTime();
    } else if (typeof val === "bigint") {
      // Convert bigint to number for wire format
      result[snakeKey] = Number(val);
    } else {
      result[snakeKey] = val;
    }
  }
  
  return result as MutationRow;
}

export const mutationsRouter = router({
  applyMutations: protectedProcedure
    .input(inputSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Parent tables first so a child referencing a parent created in the
      // same request never hits a transient FK violation.
      const TABLE_PRIORITY: Record<string, number> = {
        accounts: 0,
        categories: 1,
        category_budgets: 2,
        tokens: 3,
        templates: 4,
        scheduled_transactions: 5,
        push_subscriptions: 6,
        transfers: 7,
        trades: 8,
        transactions: 9,
        token_transactions: 10,
      };
      const orderedBatches = [...input.batches].sort(
        (a, b) => (TABLE_PRIORITY[a.table] ?? 50) - (TABLE_PRIORITY[b.table] ?? 50),
      );

      // Process all batches in a transaction
      const results = await db.transaction(async (tx) => {
        const batchResults = [];

        for (const batch of orderedBatches) {
          const tableConfig = TABLE_REGISTRY[batch.table];

          // Enforce per-user isolation: rows are stamped with the authenticated
          // user's id regardless of what the client sent.
          const upserts = batch.upserts.map(
            (row) => ({ ...row, user_id: user.id }) as MutationRow,
          );
          const deletes = batch.deletes.map(
            (row) => ({ ...row, user_id: user.id }) as MutationRow,
          );

          // Unknown table -> skip all
          if (!tableConfig) {
            const allRows = [...upserts, ...deletes];
            batchResults.push({
              table: batch.table,
              applied: 0,
              skipped: allRows.map((row) => ({
                id: String(row.id),
                reason: "unknown-table" as const,
              })),
            });
            continue;
          }

          const { table, snakeToCamel, camelToSnake } = tableConfig;

          // Collect all row IDs
          const allIds = [
            ...upserts.map((r) => String(r.id)),
            ...deletes.map((r) => String(r.id)),
          ];

          // Load existing rows
          const existingRows =
            allIds.length > 0
              ? await tx
                  .select()
                  .from(table)
                  .where(inArray(table.id, allIds))
              : [];

          // Build existingById map in snake_case
          const existingById = new Map<string, MutationRow | undefined>();
          for (const row of existingRows) {
            const snakeRow = translateCamelToSnake(row, camelToSnake);
            existingById.set(snakeRow.id, snakeRow);
          }

          // Resolve mutations
          const resolution = resolveMutations(
            {
              table: batch.table,
              upserts,
              deletes,
            },
            existingById,
            { userId: user.id }
          );

          const constraintSkips: Array<{ id: string; reason: "constraint" }> = [];

          // Apply resolved rows, each inside its own savepoint so one
          // constraint-failing row (orphaned FK, unknown asset) is skipped
          // instead of 500ing the whole batch — otherwise PowerSync retries
          // the same batch forever and real sync is blocked.
          for (const appliedRow of resolution.applied) {
            const camelRow = translateSnakeToCamel(appliedRow, snakeToCamel);
            // Strip id from SET (conflict target); created_at preserved per contract
            const setFields = { ...camelRow };
            delete setFields.id;

            try {
              await tx.transaction(async (tx2) => {
                await tx2
                  .insert(table)
                  .values(camelRow)
                  .onConflictDoUpdate({
                    target: table.id,
                    set: setFields,
                  });
              });
            } catch (err) {
              constraintSkips.push({ id: String(appliedRow.id), reason: "constraint" });
              console.warn(
                `[applyMutations] skipped ${batch.table} row ${appliedRow.id}: ${(err as Error).message}`,
              );
            }
          }

          batchResults.push({
            table: batch.table,
            applied: resolution.applied.length - constraintSkips.length,
            skipped: [...resolution.skipped, ...constraintSkips],
          });
        }

        return batchResults;
      });

      return results;
    }),
});
