"use client";

import { Cloud, CloudOff } from "lucide-react";
import { useSync } from "@/lib/sync/sync-context";

export function SyncStatus() {
  const { syncStatus, userId } = useSync();
  const isConnected = syncStatus.online;

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-4">
        <Cloud className="h-5 w-5 shrink-0 text-(--accent)" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Syncing</p>
          <p className="text-xs text-zinc-500">Connected — changes sync in the background</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-(--radius-md) border border-(--border) bg-(--surface-2) p-4">
      <CloudOff className="h-5 w-5 shrink-0 text-zinc-500" />
      <div className="min-w-0">
        <p className="text-sm font-medium">Local mode</p>
        <p className="text-xs text-zinc-500">
          {userId ? "Sync not connected — data stays on this device" : "Sign in to sync across devices"}
        </p>
      </div>
    </div>
  );
}
