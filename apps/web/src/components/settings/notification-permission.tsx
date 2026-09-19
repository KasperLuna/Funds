"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/notifications";

export const NotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);
  const { db, userId } = useSync();

  // cavetail: Notification.permission is a browser API read once on mount;
  // not derivable from props/state. Defer to Wave 3 (rule 15) for the TanStack
  // Query migration if we want a `useQuery`-driven version.
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    // The server guards enrollment on this key; an empty key means pushes can
    // never work — surface it instead of a silently dead Enable button.
    fetch("/api/push/config")
      .then((res) => res.json())
      .then((cfg) => setPushConfigured(Boolean((cfg as { vapidPublicKey?: string }).vapidPublicKey)))
      .catch(() => setPushConfigured(null));
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
        setPushConfigured(Boolean(vapidPublicKey));
        if (vapidPublicKey) {
          await subscribeToPush(db, userId, vapidPublicKey);
        } else {
          toast("Push isn't configured on the server yet — VAPID keys missing");
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

  const sendTest = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        delivered?: number;
        total?: number;
        vapidConfigured?: boolean;
      } | null;
      if (res.ok && (body?.delivered ?? 0) > 0) {
        toast("Test sent — check your notifications");
      } else if (res.ok && body?.vapidConfigured === false) {
        toast("Push keys missing on the server — generate VAPID keys");
      } else if (res.ok && (body?.total ?? 0) > 0) {
        toast(`Server couldn't reach the push service (0/${body?.total} delivered)`);
      } else if (res.ok) {
        toast("No subscriptions on the server — toggle off and on again");
      } else {
        toast("Test failed — try again");
      }
    } catch (err) {
      console.error("Failed to send test push:", err);
      toast("Test failed — try again");
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
          {pushConfigured === false && (
            <p className="text-xs text-amber-500">
              Push isn't configured on the server yet (VAPID keys missing).
            </p>
          )}
        </div>
      </div>
      {permission === "granted" ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void sendTest()} disabled={busy}>
            Test
          </Button>
          <Button variant="outline" size="sm" onClick={() => void disable()} disabled={busy}>
            Disable
          </Button>
        </div>
      ) : permission !== "denied" ? (
        <Button variant="outline" size="sm" onClick={() => void request()} disabled={busy}>
          Enable
        </Button>
      ) : null}
    </div>
  );
};
