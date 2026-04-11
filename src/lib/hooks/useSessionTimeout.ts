"use client";

import { useCallback, useEffect, useRef } from "react";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["mousedown", "keydown", "touchstart", "scroll"];

/**
 * Hook that monitors user activity and triggers a callback
 * after a specified period of inactivity (default: 30 minutes).
 *
 * Listens for mouse, keyboard, touch, and scroll events to reset the timer.
 *
 * @param onTimeout - Callback invoked when the session times out
 * @param timeoutMs - Inactivity duration in ms before timeout (default: 30 min)
 */
export function useSessionTimeout(onTimeout: () => void, timeoutMs: number = SESSION_TIMEOUT_MS) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep callback ref fresh without re-running effects
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    // Start the initial timer
    resetTimer();

    // Attach activity listeners
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [resetTimer]);
}
