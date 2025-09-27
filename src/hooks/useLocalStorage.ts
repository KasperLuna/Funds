import { useState, useEffect } from "react";

/**
 * useLocalStorage hook for Next.js (SSR-safe)
 * @param key The localStorage key
 * @param initialValue The initial value (or function returning it)
 */
export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  // SSR-safe: useState fallback to initialValue if window is undefined
  const getInitial = () => {
    if (typeof window === "undefined")
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item
        ? (JSON.parse(item) as T)
        : typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue;
    } catch {
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(getInitial);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
      // Dispatch custom event for same-tab listeners
      window.dispatchEvent(
        new CustomEvent("local-storage", {
          detail: { key, value: storedValue },
        })
      );
    } catch {}
  }, [key, storedValue]);

  // Listen for changes from other tabs and same tab
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) {
        setStoredValue(
          event.newValue
            ? JSON.parse(event.newValue)
            : typeof initialValue === "function"
              ? (initialValue as () => T)()
              : initialValue
        );
      }
    };
    const handleCustom = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.key === key) {
        setStoredValue(customEvent.detail.value);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("local-storage", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("local-storage", handleCustom);
    };
  }, [key, initialValue]);

  return [storedValue, setStoredValue] as const;
}
