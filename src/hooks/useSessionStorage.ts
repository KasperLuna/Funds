import { useState, useEffect } from "react";

/**
 * useSessionStorage hook for Next.js (SSR-safe)
 * Like useLocalStorage but scoped to the browser session — resets on tab close.
 * @param key The sessionStorage key
 * @param initialValue The initial value (or function returning it)
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T | (() => T)
) {
  const getInitial = () => {
    if (typeof window === "undefined")
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    try {
      const item = window.sessionStorage.getItem(key);
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
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(storedValue));
      window.dispatchEvent(
        new CustomEvent("session-storage", {
          detail: { key, value: storedValue },
        })
      );
    } catch {}
  }, [key, storedValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleCustom = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.key === key) {
        setStoredValue(customEvent.detail.value);
      }
    };
    window.addEventListener("session-storage", handleCustom);
    return () => {
      window.removeEventListener("session-storage", handleCustom);
    };
  }, [key, initialValue]);

  return [storedValue, setStoredValue] as const;
}
