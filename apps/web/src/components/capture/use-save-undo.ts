import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncDatabase } from "@/lib/sync";
import { buildUndoTombstone } from "@/lib/capture";

const UNDO_WINDOW_MS = 5000;

const COLS = [
  "id",
  "user_id",
  "account_id",
  "asset_id",
  "amount_minor",
  "type",
  "description",
  "category_ids",
  "date",
  "created_at",
  "updated_at",
  "deleted_at",
] as const;

function upsertSql(row: Record<string, unknown>): { sql: string; params: unknown[] } {
  const placeholders = COLS.map(() => "?").join(", ");
  const params = COLS.map((c) => row[c]);
  return {
    sql: `INSERT INTO transactions (${COLS.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET updated_at = excluded.updated_at`,
    params,
  };
}

export function useSaveUndo(sync: SyncDatabase): {
  save: (row: Record<string, unknown>) => Promise<void>;
  lastSaved: Record<string, unknown> | null;
  canUndo: boolean;
  undo: () => Promise<void>;
  dismissUndo: () => void;
} {
  const [lastSaved, setLastSaved] = useState<Record<string, unknown> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const save = useCallback(
    async (row: Record<string, unknown>) => {
      // cavetail: local-first write; sync upload queue drains it later
      await sync.execute(upsertSql(row).sql, upsertSql(row).params);
      setLastSaved(row);
      clearTimer();
      timer.current = setTimeout(() => setLastSaved(null), UNDO_WINDOW_MS);
    },
    [sync, clearTimer],
  );

  const undo = useCallback(async () => {
    if (!lastSaved) return;
    const tombstone = buildUndoTombstone(lastSaved);
    await sync.execute(upsertSql(tombstone).sql, upsertSql(tombstone).params);
    setLastSaved(null);
    clearTimer();
  }, [lastSaved, sync, clearTimer]);

  const dismissUndo = useCallback(() => {
    setLastSaved(null);
    clearTimer();
  }, [clearTimer]);

  return { save, lastSaved, canUndo: lastSaved !== null, undo, dismissUndo };
}