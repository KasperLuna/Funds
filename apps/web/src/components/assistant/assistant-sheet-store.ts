import { create } from "zustand";

interface AssistantSheetState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useAssistantSheetStore = create<AssistantSheetState>()((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
