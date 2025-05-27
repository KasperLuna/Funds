import { usePushNotification } from "@/store/PushNotificationContext";
import React from "react";

const PushNotificationSettings: React.FC = () => {
  const { permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotification();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // iOS detection helpers
  const isIOS = () =>
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;
  const isStandalone = () =>
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  const showPushControls = !isIOS() || (isIOS() && isStandalone());

  // Wrap subscribe/unsubscribe to handle errors and loading
  const handleSubscribe = async () => {
    setError(null);
    setLoading(true);
    try {
      await subscribe();
    } catch (e: any) {
      setError(e?.message || "Failed to subscribe to notifications.");
    } finally {
      setLoading(false);
    }
  };
  const handleUnsubscribe = async () => {
    setError(null);
    setLoading(true);
    try {
      await unsubscribe();
    } catch (e: any) {
      setError(e?.message || "Failed to unsubscribe from notifications.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="font-semibold">Push Notifications</div>
      <div>Permission: {permission}</div>
      <div>Status: {isSubscribed ? "Subscribed" : "Not Subscribed"}</div>
      {showPushControls ? (
        permission === "granted" ? (
          isSubscribed ? (
            <button
              className="btn"
              onClick={handleUnsubscribe}
              disabled={loading}
            >
              {loading ? "Unsubscribing..." : "Unsubscribe"}
            </button>
          ) : (
            <button
              className="btn"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? "Subscribing..." : "Subscribe"}
            </button>
          )
        ) : (
          <button className="btn" onClick={handleSubscribe} disabled={loading}>
            {loading ? "Enabling..." : "Enable Notifications"}
          </button>
        )
      ) : (
        <div className="text-xs text-slate-400">
          To enable push notifications on iOS, add this app to your home screen
          and open it from there.
        </div>
      )}
      {error && <div className="text-xs text-red-500">{error}</div>}
      <div className="text-xs text-slate-400">
        You must allow notifications in your browser. On iOS, install this app
        to your home screen for push support.
      </div>
    </div>
  );
};

export default PushNotificationSettings;
