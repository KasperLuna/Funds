"use client";

import { useEffect } from "react";
import { useCaptureSheet } from "@/components/capture/capture-sheet-context";

/**
 * URL-param deep-link bridge for the shell-owned capture sheet.
 *
 * Mirrors `AssistantOpener`: on mount, if the URL carries `?capture=1` or
 * `?type=expense|income`, the sheet opens with that prefill and the params
 * are stripped from the address bar so a refresh doesn't re-trigger.
 *
 * cavetail: window.history.replaceState is a browser API outside React; the
 * effect runs once on mount and the param deletion is irreversible for the
 * current page lifetime — that is the contract a deep-link bridge should
 * have.
 */
export const CaptureOpener = () => {
  const { setOpen, setPrefill } = useCaptureSheet();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const capture = params.get("capture");
    if (capture !== "1") return;
    const type = params.get("type");
    setOpen(true);
    if (type === "expense" || type === "income") {
      setPrefill({
        accountId: null,
        amountInput: null,
        categoryIds: [],
        description: "",
        type,
      });
    }
    params.delete("capture");
    params.delete("type");
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [setOpen, setPrefill]);
  return null;
};
