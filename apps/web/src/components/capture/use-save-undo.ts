import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncDatabase } from "@/lib/sync";
import { buildUndoTombstone } from "@/lib/capture";

const UNDO_WINDOW_MS = 5000;

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
      await sync.table("transactions").upsert(row);
      setLastSaved(row);
      clearTimer();
      timer.current = setTimeout(() => setLastSaved(null), UNDO_WINDOW_MS);
    },
    [sync, clearTimer],
  );

  const undo = useCallback(async () => {
    if (!lastSaved) return;
    const tombstone = buildUndoTombstone(lastSaved);
    await sync.table("transactions").upsert(tombstone);
    setLastSaved(null);
    clearTimer();
  }, [lastSaved, sync, clearTimer]);

  const dismissUndo = useCallback(() => {
    setLastSaved(null);
    clearTimer();
  }, [clearTimer]);

  return { save, lastSaved, canUndo: lastSaved !== null, undo, dismissUndo };
}
