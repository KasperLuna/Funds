"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { VoicePrefill } from "@/components/capture/capture-sheet";

type CaptureSheetContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  prefill: VoicePrefill | undefined;
  setPrefill: (next: VoicePrefill | undefined) => void;
  defaultAccountId: string | undefined;
  setDefaultAccountId: (id: string | undefined) => void;
  editingTxnId: string | undefined;
  setEditingTxnId: (id: string | undefined) => void;
};

const CaptureSheetContext = createContext<CaptureSheetContextValue | null>(null);

interface CaptureSheetProviderProps {
  children: ReactNode;
}

/**
 * Open state + prefill slot for the dashboard-mounted capture sheet.
 *
 * The shell `AddButton` (sidebar) and the mobile FAB both drive this provider
 * via `useCaptureSheet().setOpen(true)` — no router, so the sheet opens on
 * whatever page the user is on without a route change. A URL-param bridge
 * (`CaptureOpener`) keeps `?capture=1` / `?type=...` deep links working
 * without a navigation.
 *
 * Voice, assistant, and edit prefills also flow through the same slot so the
 * page-local CaptureSheet mounts in the dashboard / banks-panel /
 * scheduled-card can stay as the entry points for those flows without
 * competing with the shell-owned instance.
 */
export const CaptureSheetProvider = ({ children }: CaptureSheetProviderProps) => {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<VoicePrefill | undefined>();
  const [defaultAccountId, setDefaultAccountId] = useState<string | undefined>();
  const [editingTxnId, setEditingTxnId] = useState<string | undefined>();
  const value = useMemo<CaptureSheetContextValue>(
    () => ({ open, setOpen, prefill, setPrefill, defaultAccountId, setDefaultAccountId, editingTxnId, setEditingTxnId }),
    [open, prefill, defaultAccountId, editingTxnId],
  );
  return <CaptureSheetContext.Provider value={value}>{children}</CaptureSheetContext.Provider>;
};

export const useCaptureSheet = (): CaptureSheetContextValue => {
  const ctx = useContext(CaptureSheetContext);
  if (!ctx) {
    throw new Error("useCaptureSheet must be used inside <CaptureSheetProvider>");
  }
  return ctx;
};
