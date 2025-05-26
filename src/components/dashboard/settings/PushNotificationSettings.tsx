import { usePushNotification } from "@/store/PushNotificationContext";
import React from "react";

const PushNotificationSettings: React.FC = () => {
  const { permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotification();

  return (
    <div className="space-y-2">
      <div className="font-semibold">Push Notifications</div>
      <div>Permission: {permission}</div>
      <div>Status: {isSubscribed ? "Subscribed" : "Not Subscribed"}</div>
      {permission === "granted" ? (
        isSubscribed ? (
          <button className="btn" onClick={unsubscribe}>
            Unsubscribe
          </button>
        ) : (
          <button className="btn" onClick={subscribe}>
            Subscribe
          </button>
        )
      ) : (
        <button className="btn" onClick={subscribe}>
          Enable Notifications
        </button>
      )}
      <div className="text-xs text-slate-400">
        You must allow notifications in your browser. On iOS, install this app to
        your home screen for push support.
      </div>
    </div>
  );
};

export default PushNotificationSettings;
