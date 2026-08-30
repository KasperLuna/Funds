"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { VoicePrefill } from "@/components/capture/capture-sheet";

/**
 * Tiny shared prefill slot between the assistant's voice-to-txn card and the
 * dashboard's CaptureSheet. The assistant writes; the dashboard reads; the
 * existing CaptureSheet contract is unchanged.
 *
 * cavetail: this lives in the voice module because the prefill shape mirrors
 * the deterministic `resolvePrefill` output. The assistant is just another
 * source of prefill data; the capture sheet does not need to know that.
 */
type VoicePrefillSlot = {
  prefill: VoicePrefill | undefined;
  setPrefill: (next: VoicePrefill | undefined) => void;
};

const Ctx = createContext<VoicePrefillSlot>({
  prefill: undefined,
  setPrefill: () => {},
});

export function VoicePrefillProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<VoicePrefill | undefined>();
  return <Ctx.Provider value={{ prefill, setPrefill }}>{children}</Ctx.Provider>;
}

export function useVoicePrefill() {
  return useContext(Ctx);
}
