/**
 * Idempotent mutation-resolution engine for client-uploaded row mutations.
 * Pure function with no I/O - server supplies existing rows as lookup map.
 */

export type MutationRow = {
  id: string;
  user_id: string;
  created_at: number; // epoch ms
  updated_at: number; // epoch ms
  deleted_at?: number | null;
  [field: string]: unknown;
};

export type MutationsBatch = {
  table: string;
  upserts: MutationRow[];
  deletes: MutationRow[]; // tombstone rows: deleted_at set
};

export type ApplyContext = { userId: string; now?: number };

export type SkippedReason = "stale" | "replay" | "other-user" | "unknown-table";

export type ApplyResult = {
  applied: MutationRow[];
  skipped: { id: string; reason: SkippedReason }[];
};

export const REPLICATED_TABLES: Record<string, { softDelete: boolean }> = {
  accounts: { softDelete: true },
  categories: { softDelete: true },
  transactions: { softDelete: true },
  transfers: { softDelete: true },
  trades: { softDelete: true },
  templates: { softDelete: true },
  scheduled_transactions: { softDelete: true },
  push_subscriptions: { softDelete: true },
};

/**
 * Deep equality check for mutation rows.
 * Compares all fields in both objects.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // null/undefined equivalent (clients omit empty columns)
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const av = a[key];
      const bv = b[key];
      if (av === bv) continue;
      if (!deepEqual(av, bv)) return false;
    }
    return true;
  }

  return false;
}

/**
 * Resolve a single mutation row against an existing row (if any).
 * Returns the resolution decision.
 */
function resolveRow(
  row: MutationRow,
  existing: MutationRow | undefined,
  ctx: ApplyContext
): { action: "apply" | "skip"; reason?: SkippedReason } {
  // User isolation check
  if (row.user_id !== ctx.userId) {
    return { action: "skip", reason: "other-user" };
  }

  // No existing row -> apply (new insert)
  if (!existing) {
    return { action: "apply" };
  }

  // Compare timestamps
  if (existing.updated_at < row.updated_at) {
    // Newer wins
    return { action: "apply" };
  }

  if (existing.updated_at > row.updated_at) {
    // Older loses
    return { action: "skip", reason: "stale" };
  }

  // Same timestamp - check deep equality
  if (deepEqual(existing, row)) {
    // Identical replay
    return { action: "skip", reason: "replay" };
  }

  // Same timestamp but different fields - deterministic last-arrival wins
  return { action: "apply" };
}

/**
 * Idempotent mutation-resolution engine.
 * Decides which client-uploaded row mutations the server may apply.
 *
 * @param batch - Batch of mutations to process
 * @param existingById - Map of existing rows by id
 * @param ctx - Apply context with user id
 * @returns Result with applied and skipped rows
 */
export function resolveMutations(
  batch: MutationsBatch,
  existingById: Map<string, MutationRow | undefined>,
  ctx: ApplyContext
): ApplyResult {
  const applied: MutationRow[] = [];
  const skipped: { id: string; reason: SkippedReason }[] = [];

  // Check if table is replicated
  if (!(batch.table in REPLICATED_TABLES)) {
    // Unknown table - skip all rows
    for (const row of batch.upserts) {
      skipped.push({ id: row.id, reason: "unknown-table" });
    }
    for (const row of batch.deletes) {
      skipped.push({ id: row.id, reason: "unknown-table" });
    }
    return { applied, skipped };
  }

  // Track effective state after upserts for delete processing
  const effectiveState = new Map(existingById);

  // Process upserts first
  for (const row of batch.upserts) {
    const existing = effectiveState.get(row.id);
    const resolution = resolveRow(row, existing, ctx);

    if (resolution.action === "apply") {
      applied.push(row);
      effectiveState.set(row.id, row);
    } else {
      skipped.push({ id: row.id, reason: resolution.reason! });
    }
  }

  // Process deletes AFTER upserts (tombstone wins delete-vs-update race)
  for (const row of batch.deletes) {
    const existing = effectiveState.get(row.id);
    const resolution = resolveRow(row, existing, ctx);

    if (resolution.action === "apply") {
      applied.push(row);
      effectiveState.set(row.id, row);
    } else {
      skipped.push({ id: row.id, reason: resolution.reason! });
    }
  }

  return { applied, skipped };
}
