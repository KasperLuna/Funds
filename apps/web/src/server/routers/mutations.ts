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
 * Convert snake_case row to camelCase for drizzle
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
    
    // Skip null/undefined
    if (val == null) {
      result[camelKey] = val;
      continue;
    }
    
    // Convert timestamps from epoch ms to Date
    if ((camelKey.endsWith("At") || camelKey === "date") && typeof val === "number") {
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
      
      // Process all batches in a transaction
      const results = await db.transaction(async (tx) => {
        const batchResults = [];
        
        for (const batch of input.batches) {
          const tableConfig = TABLE_REGISTRY[batch.table];
          
          // Unknown table -> skip all
          if (!tableConfig) {
            const allRows = [...batch.upserts, ...batch.deletes];
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
            ...batch.upserts.map((r) => String(r.id)),
            ...batch.deletes.map((r) => String(r.id)),
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
              upserts: batch.upserts as MutationRow[],
              deletes: batch.deletes as MutationRow[],
            },
            existingById,
            { userId: user.id }
          );
          
          // Apply resolved rows
          for (const appliedRow of resolution.applied) {
            const camelRow = translateSnakeToCamel(appliedRow, snakeToCamel);
            // Strip id from SET (conflict target); created_at preserved per contract
            const setFields = { ...camelRow };
            delete setFields.id;
            
            // Upsert with ON CONFLICT DO UPDATE
            await tx
              .insert(table)
              .values(camelRow)
              .onConflictDoUpdate({
                target: table.id,
                set: setFields,
              });
          }
          
          batchResults.push({
            table: batch.table,
            applied: resolution.applied.length,
            skipped: resolution.skipped,
          });
        }
        
        return batchResults;
      });
      
      return results;
    }),
});
