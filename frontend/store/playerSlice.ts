import { create } from "zustand";
import { DEFAULT_FPS } from "@/lib/constants";

interface PlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  activeInsightId: string | null;
  fps: number;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveInsightId: (id: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  activeInsightId: null,
  fps: DEFAULT_FPS,
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setActiveInsightId: (id) => set({ activeInsightId: id }),
}));
