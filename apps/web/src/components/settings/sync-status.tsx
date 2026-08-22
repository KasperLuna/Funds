import { CloudOff } from "lucide-react";

export function SyncStatus() {
  return (
    <div className="flex items-center gap-3 rounded-(--radius-md) border border-(--border) bg-(--surface-1) p-4">
      <CloudOff className="h-5 w-5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-sm font-medium">Local mode</p>
        <p className="text-xs text-slate-400">Sync not connected</p>
      </div>
    </div>
  );
}
