import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { pb } from "../lib/pocketbase/pocketbase";
import { useAuth } from "../lib/hooks/useAuth";
import { PushSubscription } from "../lib/types";

interface PushNotificationContextProps {
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushNotificationContext = createContext<
  PushNotificationContextProps | undefined
>(undefined);

export const PushNotificationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { user } = useAuth();

  // Helper to get current push subscription from browser
  const getBrowserSubscription =
    React.useCallback(async (): Promise<PushSubscription | null> => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window))
        return null;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return null;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return null;
      const json = sub.toJSON();
      return {
        user: user?.id ?? "",
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      };
    }, [user]);

  // Check if user is subscribed in backend
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const browserSub = await getBrowserSubscription();
        if (!browserSub) {
          setIsSubscribed(false);
          return;
        }
        // Check if this subscription exists in backend
        const records = await pb.collection("push_subscriptions")?.getFullList({
          filter: `user="${user.id}" && endpoint="${browserSub.endpoint}"`,
          requestKey: null,
        });
        setIsSubscribed(records.length > 0);
      } catch (e) {
        setIsSubscribed(false);
        if (process.env.NODE_ENV === "development") console.error(e);
      }
    })();
  }, [user, getBrowserSubscription]); // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscribe = async () => {
    console.debug("[PushNotification] subscribe called");
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      console.warn(
        "[PushNotification] Browser does not support notifications or service workers"
      );
      return;
    }
    const permissionResult = await Notification.requestPermission();
    console.debug(
      "[PushNotification] Notification permission result:",
      permissionResult
    );
    setPermission(permissionResult);
    if (permissionResult !== "granted") {
      console.warn("[PushNotification] Notification permission not granted");
      return;
    }
    // Register service worker if not already
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      console.debug("[PushNotification] Registering service worker");
      reg = await navigator.serviceWorker.register("/sw.js");
    }
    // Subscribe to push
    console.debug("[PushNotification] Subscribing to push");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    const json = sub.toJSON();
    console.debug("[PushNotification] Push subscription JSON:", json);
    // Check if this device is already subscribed in PocketBase
    const existing = await pb.collection("push_subscriptions")?.getFullList({
      filter: `user='${user?.id}' && endpoint='${json.endpoint}'`,
      requestKey: null,
    });
    if (existing.length > 0) {
      // Update the existing subscription for this device
      await pb.collection("push_subscriptions").update(existing[0].id, {
        keys: json.keys,
      });
      console.debug(
        "[PushNotification] Updated existing push subscription in backend"
      );
    } else {
      // Store new subscription in backend
      await pb.collection("push_subscriptions").create({
        user: user?.id,
        endpoint: json.endpoint,
        keys: json.keys,
      });
      console.debug(
        "[PushNotification] Subscription complete and stored in backend"
      );
    }
    setIsSubscribed(true);
    console.debug(
      "[PushNotification] Subscription complete and stored in backend"
    );
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const json = sub.toJSON();
    // Remove from backend
    if (user?.id && json.endpoint) {
      const records = await pb.collection("push_subscriptions")?.getFullList({
        filter: `user="${user.id}" && endpoint="${json.endpoint}"`,
      });
      for (const rec of records) {
        await pb.collection("push_subscriptions").delete(rec.id);
      }
    }
    await sub.unsubscribe();
    setIsSubscribed(false);
  };

  return (
    <PushNotificationContext.Provider
      value={{ permission, isSubscribed, subscribe, unsubscribe }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
};

export const usePushNotification = () => {
  const context = useContext(PushNotificationContext);
  if (!context)
    throw new Error(
      "usePushNotification must be used within PushNotificationProvider"
    );
  return context;
};

// If you want to avoid the exhaustive-deps warning, you can define getBrowserSubscription with useCallback if needed.
