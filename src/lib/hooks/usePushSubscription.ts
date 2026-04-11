"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pocketbase/pocketbase";
import { queryKeys } from "./queryKeys";
import type { PushSubscription as PBPushSubscription } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a base64 string to a Uint8Array for use with the Web Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether the browser supports push notifications.
 */
function checkPushSupport(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages Web Push API subscriptions and syncs them with PocketBase.
 *
 * Returns:
 * - `isSupported` – whether the browser supports push notifications
 * - `isSubscribed` – whether the current device has an active subscription
 * - `isLoading` – whether a subscribe/unsubscribe operation is in progress
 * - `subscribe()` – registers a push subscription and stores it in PocketBase
 * - `unsubscribe()` – removes the push subscription from the browser and PocketBase
 */
export function usePushSubscription() {
  const queryClient = useQueryClient();
  const userId = pb.authStore.record?.id;
  const isSupported = checkPushSupport();

  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  // Detect existing browser subscription on mount
  useEffect(() => {
    if (!isSupported) return;

    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) {
          setCurrentEndpoint(subscription?.endpoint ?? null);
        }
      })
      .catch(() => {
        // Silently ignore – push may not be available
      });

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  // Fetch user's stored subscriptions from PocketBase
  const { data: storedSubscriptions } = useQuery<PBPushSubscription[]>({
    queryKey: queryKeys.pushSubscriptions.list(),
    queryFn: async () => {
      if (!userId) return [];
      return pb.collection("push_subscriptions").getFullList<PBPushSubscription>({
        filter: `user = "${userId}"`,
      });
    },
    enabled: !!userId,
  });

  // Determine if the current device is subscribed
  const isSubscribed =
    currentEndpoint !== null &&
    (storedSubscriptions ?? []).some((s) => s.endpoint === currentEndpoint);

  // ── Subscribe mutation ───────────────────────────────────────────────────

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key not configured");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      const record = await pb.collection("push_subscriptions").create<PBPushSubscription>({
        user: userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });

      return { subscription, record };
    },

    onSuccess: ({ subscription }) => {
      setCurrentEndpoint(subscription.endpoint);
      queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions.all });
    },
  });

  // ── Unsubscribe mutation ─────────────────────────────────────────────────

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Find the matching PocketBase record
        const stored = (storedSubscriptions ?? []).find(
          (s) => s.endpoint === subscription.endpoint,
        );

        // Unsubscribe from the browser
        await subscription.unsubscribe();

        // Remove from PocketBase
        if (stored?.id) {
          await pb.collection("push_subscriptions").delete(stored.id);
        }
      }
    },

    onSuccess: () => {
      setCurrentEndpoint(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions.all });
    },
  });

  // ── Public API ───────────────────────────────────────────────────────────

  const subscribe = useCallback(() => subscribeMutation.mutate(), [subscribeMutation]);
  const unsubscribe = useCallback(() => unsubscribeMutation.mutate(), [unsubscribeMutation]);

  return {
    isSupported,
    isSubscribed,
    isLoading: subscribeMutation.isPending || unsubscribeMutation.isPending,
    subscribe,
    unsubscribe,
  };
}
