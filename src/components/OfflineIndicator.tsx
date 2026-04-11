"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { getQueueLength } from "@/lib/utils/offlineQueue";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      setQueueLength(getQueueLength());
    }

    function handleOffline() {
      setIsOnline(false);
      setShowBackOnline(false);
      setQueueLength(getQueueLength());
    }

    function handleOnline() {
      setIsOnline(true);
      setShowBackOnline(true);
      setQueueLength(0);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Poll queue length while offline
  useEffect(() => {
    if (isOnline) return;
    const interval = setInterval(() => {
      setQueueLength(getQueueLength());
    }, 2000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Auto-hide "Back online" message after 3 seconds
  useEffect(() => {
    if (!showBackOnline) return;
    const timer = setTimeout(() => setShowBackOnline(false), 3000);
    return () => clearTimeout(timer);
  }, [showBackOnline]);

  if (isOnline && !showBackOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        isOnline ? "bg-green-700 text-white" : "bg-amber-800 text-white"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="size-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="size-4" />
          <span>
            You&apos;re offline
            {queueLength > 0 &&
              ` · ${queueLength} transaction${queueLength === 1 ? "" : "s"} pending sync`}
          </span>
        </>
      )}
    </div>
  );
}
