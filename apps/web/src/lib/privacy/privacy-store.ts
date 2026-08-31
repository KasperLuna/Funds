import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrivacyState {
  masked: boolean;
  toggle: () => void;
  setMasked: (v: boolean) => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      masked: true,
      toggle: () => set((s) => ({ masked: !s.masked })),
      setMasked: (v) => set({ masked: v }),
    }),
    { name: "funds.privacy" },
  ),
);
