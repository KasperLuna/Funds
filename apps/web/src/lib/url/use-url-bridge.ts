"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface UseUrlBridgeOptions {
  /** Query string key to watch for. Triggers `onMatch` when its value is `"1"`. */
  param: string;
  /** Side effect to run when the param is present. */
  onMatch: () => void;
}

/**
 * cavetail: URL-param deep-link bridge. Fires `onMatch()` once when
 * `?param=1` is present — including client-side navigations to the same
 * page (e.g. banks tab → ?tab=crypto&trade=1), where the panel mounts
 * after the query changes. Strips the param via `router.replace` so a
 * refresh doesn't re-trigger and Next's searchParams cache stays in sync
 * (history.replaceState would leave useSearchParams stale).
 */
export function useUrlBridge({ param, onMatch }: UseUrlBridgeOptions): void {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const matchRef = useRef(onMatch);
  matchRef.current = onMatch;
  const triggered = searchParams.get(param) === "1";

  useEffect(() => {
    if (!triggered) return;
    matchRef.current();
    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [triggered, searchParams, pathname, router, param]);
}
