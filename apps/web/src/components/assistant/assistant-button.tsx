"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { AssistantSheet } from "./assistant-sheet";
import { useAssistantSheetStore } from "./assistant-sheet-store";
import { useChat } from "./use-chat";
import { cn } from "@/lib/utils";

interface AssistantButtonProps {
  className?: string;
}

/**
 * Floating action button that opens the assistant chat sheet. The sheet
 * itself is mounted once in the dashboard layout (`AssistantSheetMount`)
 * and shared via context, so any "open the assistant" surface — the FAB
 * here, a Settings link, a deep link with `?openAssistant=1` — drives
 * the same instance.
 *
 * The button is always visible. Model download happens on first use; if
 * the device can't run the model the sheet surfaces a capability error.
 */
export const AssistantButton = ({ className }: AssistantButtonProps) => {
  const setOpen = useAssistantSheetStore((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open assistant"
      className={cn(
        "hidden z-30 md:flex h-12 w-12 items-center justify-center rounded-full bg-(--accent) text-(--accent-foreground) shadow-lg transition-[transform,filter] hover:scale-105 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none active:scale-95 bottom-6 right-6",
        className,
      )}
    >
      <Sparkles className="h-5 w-5" aria-hidden />
    </button>
  );
};

/**
 * Mounts the assistant sheet once at the layout level. The FAB and any
 * deep link share this single instance via context.
 *
 * cavetail: call `probeSupport` from the render body (not an effect) when
 * the sheet opens. The probe is idempotent — the first call dispatches the
 * support state, subsequent calls are no-ops. Doing it on render keeps the
 * call site at the point of `setOpen(true)` and avoids a second `useEffect`.
 */
export const AssistantSheetMount = () => {
  const open = useAssistantSheetStore((s) => s.open);
  const { probeSupport } = useChat();
  if (open) probeSupport();
  return <AssistantSheet />;
};

/**
 * cavetail: URL-param deep-link bridge. The Settings page links to
 * `?openAssistant=1`; on mount this effect opens the sheet and rewrites
 * history to strip the param so a refresh doesn't re-trigger. The mutation
 * is a browser API outside React, so this is a real side effect.
 */
export const AssistantOpener = () => {
  const setOpen = useAssistantSheetStore((s) => s.setOpen);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("openAssistant") !== "1") return;
    setOpen(true);
    params.delete("openAssistant");
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [setOpen]);
  return null;
};
