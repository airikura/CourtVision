"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerSlice";
import { useInsightsStore } from "@/store/insightsSlice";

interface UseKeyboardShortcutsOptions {
  seekTo: (t: number) => void;
  togglePlay: () => void;
  stepFrame: (direction: 1 | -1) => void;
}

export function useKeyboardShortcuts({
  seekTo,
  togglePlay,
  stepFrame,
}: UseKeyboardShortcutsOptions) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const toggleFilter = useInsightsStore((s) => s.toggleFilter);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't fire when user is typing
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "j":
          seekTo(currentTime - 10);
          break;
        case "k":
          togglePlay();
          break;
        case "l":
          seekTo(currentTime + 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          stepFrame(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          stepFrame(1);
          break;
        case "f":
          toggleFilter("Footwork");
          break;
        case "s":
          toggleFilter("Serve");
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentTime, seekTo, togglePlay, stepFrame, toggleFilter]);
}
