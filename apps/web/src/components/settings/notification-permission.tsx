"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/notifications";

export const NotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const { db, userId } = useSync();

  // cavetail: Notification.permission is a browser API read once on mount;
  // not derivable from props/state. Defer to Wave 3 (rule 15) for the TanStack
  // Query migration if we want a `useQuery`-driven version.
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const request = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted" && userId) {
      setBusy(true);
      try {
        const res = await fetch("/api/push/config");
        const { vapidPublicKey } = (await res.json()) as { vapidPublicKey: string };
        if (vapidPublicKey) {
          await subscribeToPush(db, userId, vapidPublicKey);
        }
      } catch (err) {
        console.error("Failed to enable reminders:", err);
      } finally {
        setBusy(false);
      }
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush(db);
      setPermission("default");
    } catch (err) {
      console.error("Failed to disable reminders:", err);
    } finally {
      setBusy(false);
    }
  };

  const label =
    permission === "granted"
      ? "Enabled"
      : permission === "denied"
        ? "Blocked"
        : "Not set";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-zinc-500" />
        <div>
          <p className="text-sm font-medium">Reminders</p>
          <p className="text-xs text-zinc-500">
            {label} — receive notifications for planned transactions
          </p>
        </div>
      </div>
      {permission === "granted" ? (
        <Button variant="outline" size="sm" onClick={() => void disable()} disabled={busy}>
          Disable
        </Button>
      ) : permission !== "denied" ? (
        <Button variant="outline" size="sm" onClick={() => void request()} disabled={busy}>
          Enable
        </Button>
      ) : null}
    </div>
  );
};
