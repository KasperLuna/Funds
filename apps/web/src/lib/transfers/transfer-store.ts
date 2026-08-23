import type { SyncDatabase } from "@/lib/sync";
import { buildUndoTombstone, type TransferRows } from "@/lib/capture";

// cavetail: local-first writes; PowerSync upload queue drains them later via
// the tRPC applyMutations endpoint (see powersync-client.ts uploadData).

export async function insertTransfer(
  db: SyncDatabase,
  rows: TransferRows,
): Promise<void> {
  await db.table("transfers").upsert(rows.transfer);
  await db.table("transactions").upsert(rows.fromLeg);
  await db.table("transactions").upsert(rows.toLeg);
  if (rows.feeLeg) {
    await db.table("transactions").upsert(rows.feeLeg);
  }
}

export async function undoTransfer(
  db: SyncDatabase,
  rows: TransferRows,
  now: Date = new Date(),
): Promise<void> {
  await db.table("transfers").upsert(buildUndoTombstone(rows.transfer, now));
  await db.table("transactions").upsert(buildUndoTombstone(rows.fromLeg, now));
  await db.table("transactions").upsert(buildUndoTombstone(rows.toLeg, now));
  if (rows.feeLeg) {
    await db.table("transactions").upsert(buildUndoTombstone(rows.feeLeg, now));
  }
}
