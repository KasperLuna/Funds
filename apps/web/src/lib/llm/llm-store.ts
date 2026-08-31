import { create } from "zustand";
import type { LlmEngine } from "./types";
import type { LlmSupport } from "./capability";

interface LlmState {
  engine: LlmEngine | null;
  support: LlmSupport | null;
  setEngine: (e: LlmEngine | null) => void;
  setSupport: (s: LlmSupport | null) => void;
}

export const useLlmStore = create<LlmState>()((set) => ({
  engine: null,
  support: null,
  setEngine: (e) => set({ engine: e }),
  setSupport: (s) => set({ support: s }),
}));
