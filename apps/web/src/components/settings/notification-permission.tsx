"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSync } from "@/lib/sync/sync-context";
import {
  currentDeviceEndpoint,
  deleteDeviceSubscription,
  fetchDeviceLive,
  registerDeviceSubscription,
  unsubscribeFromPush,
} from "@/lib/push/notifications";

// Device truth, not just Notification.permission: granted means the OS will
// deliver, but only a live server row means we will send.
type DeviceState =
  | "checking"
  | "blocked"
  | "off"
  | "unregistered"
  | "stale"
  | "live";

async function vapidKey(): Promise<string> {
  const res = await fetch("/api/push/config");
  const { vapidPublicKey } = (await res.json()) as { vapidPublicKey?: string };
  return vapidPublicKey ?? "";
}

export const NotificationPermission = () => {
  const [state, setState] = useState<DeviceState>("checking");
  const [busy, setBusy] = useState(false);
  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);
  const { db } = useSync();

  const probe = useCallback(async (): Promise<DeviceState> => {
    if (typeof Notification === "undefined") return "off";
    const permission = Notification.permission;
    if (permission === "denied") return "blocked";
    if (permission !== "granted") return "off";
    const endpoint = await currentDeviceEndpoint();
    if (!endpoint) return "unregistered";
    return (await fetchDeviceLive(endpoint)) ? "live" : "stale";
  }, []);

  const refresh = useCallback(async () => {
    setState(await probe());
  }, [probe]);

  useEffect(() => {
    void vapidKey()
      .then((key) => setPushConfigured(Boolean(key)))
      .catch(() => setPushConfigured(null));
    void refresh();
  }, [refresh]);

  const register = async (): Promise<boolean> => {
    const key = await vapidKey();
    setPushConfigured(Boolean(key));
    if (!key) {
      toast("Push isn't configured on the server yet — VAPID keys missing");
      return false;
    }
    try {
      const endpoint = await registerDeviceSubscription(key);
      const live = await fetchDeviceLive(endpoint);
      setState(live ? "live" : "stale");
      return live;
    } catch (err) {
      console.error("Failed to register push:", err);
      setState("stale");
      return false;
    }
  };

  const enable = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      setState(result === "denied" ? "blocked" : "off");
      return;
    }
    setBusy(true);
    try {
      toast((await register()) ? "Push on for this device" : "Registration didn't stick — try again");
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      toast((await register()) ? "This device is registered again" : "Sync failed — try again");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const endpoint = await currentDeviceEndpoint();
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await unsubscribeFromPush(db);
      if (endpoint) await deleteDeviceSubscription(endpoint);
      await refresh();
      toast("Push off for this device");
    } catch (err) {
      console.error("Failed to disable reminders:", err);
      toast("Couldn't fully disable — try again");
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
        // A 410 prune may have retired this device mid-test — re-probe so the
        // state below tells the truth instead of blaming the user.
        await refresh();
        toast("This device isn't registered — tap Sync now");
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

  const copy: Record<DeviceState, { title: string; sub: string }> = {
    checking: { title: "Reminders", sub: "Checking this device…" },
    blocked: {
      title: "Reminders",
      sub: "Blocked — allow notifications in iOS Settings › Funds",
    },
    off: { title: "Reminders", sub: "Off — receive notifications for planned transactions" },
    unregistered: {
      title: "Reminders",
      sub: "Allowed, but this device isn't registered — register to receive them",
    },
    stale: {
      title: "Reminders",
      sub: "This device's registration lapsed — sync to receive them again",
    },
    live: {
      title: "Reminders",
      sub: "On for this device — receive notifications for planned transactions",
    },
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-zinc-500" />
        <div>
          <p className="text-sm font-medium">{copy[state].title}</p>
          <p className="text-xs text-zinc-500">{copy[state].sub}</p>
          {pushConfigured === false && (
            <p className="text-xs text-amber-500">
              Push isn't configured on the server yet (VAPID keys missing).
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {(state === "off") && (
          <Button variant="outline" size="sm" onClick={() => void enable()} disabled={busy}>
            Enable
          </Button>
        )}
        {state === "unregistered" && (
          <Button variant="outline" size="sm" onClick={() => void syncNow()} disabled={busy}>
            Register
          </Button>
        )}
        {state === "stale" && (
          <Button variant="outline" size="sm" onClick={() => void syncNow()} disabled={busy}>
            Sync now
          </Button>
        )}
        {state === "live" && (
          <>
            <Button variant="outline" size="sm" onClick={() => void sendTest()} disabled={busy}>
              Test
            </Button>
            <Button variant="outline" size="sm" onClick={() => void disable()} disabled={busy}>
              Disable
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
