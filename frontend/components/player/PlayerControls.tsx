"use client";

import { usePlayerStore } from "@/store/playerSlice";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlayerControlsProps {
  togglePlay: () => void;
  setPlaybackRate: (rate: number) => void;
}

const RATES = [0.25, 0.5, 1, 1.5, 2];

export function PlayerControls({
  togglePlay,
  setPlaybackRate,
}: PlayerControlsProps) {
  const { isPlaying, currentTime, duration } = usePlayerStore();

  return (
    <div className="flex items-center gap-4 px-2 py-2 bg-gray-900/80 rounded-b">
      <button
        onClick={togglePlay}
        className="text-white hover:text-green-400 transition-colors text-lg font-bold w-8"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      <span className="text-gray-400 text-sm font-mono tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-gray-500 text-xs">Speed</span>
        <div className="flex gap-1">
          {RATES.map((r) => (
            <button
              key={r}
              onClick={() => setPlaybackRate(r)}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              {r}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
