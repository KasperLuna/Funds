import { create } from "zustand";

interface PrivacyState {
  masked: boolean;
  toggle: () => void;
  setMasked: (v: boolean) => void;
}

// cavetail: volatile — no persist. Reload always starts masked:true.
export const usePrivacyStore = create<PrivacyState>()((set) => ({
  masked: true,
  toggle: () => set((s) => ({ masked: !s.masked })),
  setMasked: (v) => set({ masked: v }),
}));
