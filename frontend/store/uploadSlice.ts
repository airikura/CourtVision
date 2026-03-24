import { create } from "zustand";
import type { UploadPhase } from "@/types";

interface UploadState {
  phase: UploadPhase;
  compressionPct: number;
  uploadPct: number;
  sessionId: string | null;
  error: string | null;
  setPhase: (phase: UploadPhase) => void;
  setCompressionPct: (pct: number) => void;
  setUploadPct: (pct: number) => void;
  setSessionId: (id: string) => void;
  setError: (err: string) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  phase: "idle",
  compressionPct: 0,
  uploadPct: 0,
  sessionId: null,
  error: null,
  setPhase: (phase) => set({ phase }),
  setCompressionPct: (pct) => set({ compressionPct: pct }),
  setUploadPct: (pct) => set({ uploadPct: pct }),
  setSessionId: (id) => set({ sessionId: id }),
  setError: (err) => set({ error: err, phase: "error" }),
  reset: () =>
    set({
      phase: "idle",
      compressionPct: 0,
      uploadPct: 0,
      sessionId: null,
      error: null,
    }),
}));
