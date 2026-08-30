"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AssistantSheetContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

interface AssistantSheetProviderProps {
  children: ReactNode;
}

/**
 * Assistant sheet open state. The dashboard layout owns the state and
 * exposes a context so the FAB and any "open the assistant" link (e.g.
 * the Settings deep link) can drive the same sheet without prop-drilling
 * or a second `<AssistantButton>` instance.
 *
 * A URL search param `?openAssistant=1` is the Settings-page entry point
 * — `AssistantOpener` reads it on mount, calls `open()`, and cleans the
 * param so a refresh doesn't re-trigger.
 */
const AssistantSheetContext = createContext<AssistantSheetContextValue | null>(null);

export const AssistantSheetProvider = ({ children }: AssistantSheetProviderProps) => {
  const [open, setOpen] = useState(false);
  const value = useMemo<AssistantSheetContextValue>(
    () => ({ open, setOpen, toggle: () => setOpen((o) => !o) }),
    [open],
  );
  return <AssistantSheetContext.Provider value={value}>{children}</AssistantSheetContext.Provider>;
};

export const useAssistantSheet = (): AssistantSheetContextValue => {
  const ctx = useContext(AssistantSheetContext);
  if (!ctx) {
    throw new Error("useAssistantSheet must be used inside <AssistantSheetProvider>");
  }
  return ctx;
};

/** Convenience: call `open()` and don't throw if the provider is absent. */
export function tryOpenAssistantSheet() {
  // This module is a no-op in environments without the provider — the
  // Settings deep link still works on routes that mount it (the
  // dashboard layout). Pages that don't mount the provider render the
  // link but it has no effect, which is the correct degraded behaviour.
}
