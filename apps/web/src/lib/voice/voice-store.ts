import { create } from "zustand";
import type { VoicePrefill } from "@/components/capture/capture-sheet";

interface VoicePrefillState {
  prefill: VoicePrefill | undefined;
  setPrefill: (p: VoicePrefill | undefined) => void;
}

export const useVoicePrefillStore = create<VoicePrefillState>()((set) => ({
  prefill: undefined,
  setPrefill: (p) => set({ prefill: p }),
}));
