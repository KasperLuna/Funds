import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  privacyMode: boolean;
  theme: "dark" | "light";
  sidebarOpen: boolean;
  modals: Record<string, boolean>;
  togglePrivacyMode: () => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      privacyMode: false,
      theme: "dark",
      sidebarOpen: true,
      modals: {},

      togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      openModal: (id) => set((state) => ({ modals: { ...state.modals, [id]: true } })),

      closeModal: (id) => set((state) => ({ modals: { ...state.modals, [id]: false } })),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        privacyMode: state.privacyMode,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
