import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncDatabase } from "@/lib/sync";
import { buildUndoTombstone } from "@/lib/capture";
import { queryKeys, useSyncMutation } from "@/lib/sync/sync-query";

const UNDO_WINDOW_MS = 5000;

type SaveUndoVars =
  | { kind: "save"; row: Record<string, unknown> }
  | { kind: "undo"; row: Record<string, unknown> };

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

  const { mutateAsync } = useSyncMutation<SaveUndoVars>({
    keys: [queryKeys.transactions],
    mutationFn: async ({ row }) => {
      // cavetail: local-first write; sync upload queue drains it later
      await sync.table("transactions").upsert(row);
    },
  });

  const save = useCallback(
    async (row: Record<string, unknown>) => {
      await mutateAsync({ kind: "save", row });
      setLastSaved(row);
      clearTimer();
      timer.current = setTimeout(() => setLastSaved(null), UNDO_WINDOW_MS);
    },
    [mutateAsync, clearTimer],
  );

  const undo = useCallback(async () => {
    if (!lastSaved) return;
    const tombstone = buildUndoTombstone(lastSaved);
    await mutateAsync({ kind: "undo", row: tombstone });
    setLastSaved(null);
    clearTimer();
  }, [lastSaved, mutateAsync, clearTimer]);

  const dismissUndo = useCallback(() => {
    setLastSaved(null);
    clearTimer();
  }, [clearTimer]);

  return { save, lastSaved, canUndo: lastSaved !== null, undo, dismissUndo };
}
