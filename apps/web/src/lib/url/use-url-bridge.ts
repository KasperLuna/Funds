"use client";

import { useEffect } from "react";

interface UseUrlBridgeOptions {
  /** Query string key to watch for. Triggers `onMatch` when its value is `"1"`. */
  param: string;
  /** Side effect to run when the param is present. */
  onMatch: () => void;
}

/**
 * cavetail: URL-param deep-link bridge. On mount, reads `window.location.search`
 * for the given `param`; if present (value `"1"`), runs `onMatch()` once and
 * strips the param via `history.replaceState` so a refresh doesn't re-trigger.
 *
 * Mirrors the existing `AssistantOpener` pattern; this is just a hook form so
 * call sites don't have to hand-roll the same six lines. The match runs only
 * once on mount — flipping a flag like `autoOpenTrade` after mount is the
 * caller's concern (and is generally a smell; prefer URL params for one-shot
 * signals and local state for in-app triggers).
 */
export function useUrlBridge({ param, onMatch }: UseUrlBridgeOptions): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(param) !== "1") return;
    onMatch();
    params.delete(param);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [param, onMatch]);
}
