"use client";

import { useRef, MouseEvent } from "react";
import { usePlayerStore } from "@/store/playerSlice";
import { useInsightsStore } from "@/store/insightsSlice";
import { TimelineMarker } from "./TimelineMarker";

interface TimelineProps {
  seekTo: (t: number) => void;
}

export function Timeline({ seekTo }: TimelineProps) {
  const { currentTime, duration, activeInsightId, setActiveInsightId } =
    usePlayerStore();
  const insights = useInsightsStore((s) => s.insights);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !duration) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(x / rect.width, 1));
    seekTo(pct * duration);
  };

  const thumbPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full py-3 px-2 bg-gray-900/60 rounded select-none">
      {/* Track */}
      <div
        ref={trackRef}
        className="relative w-full h-8 bg-gray-700 rounded cursor-pointer"
        onClick={handleClick}
      >
        {/* Elapsed fill */}
        <div
          className="absolute top-0 left-0 h-full bg-gray-600 rounded pointer-events-none"
          style={{ width: `${thumbPct}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white pointer-events-none z-10"
          style={{ left: `${thumbPct}%` }}
        />

        {/* Insight markers */}
        {insights.map((insight) => (
          <TimelineMarker
            key={insight.id}
            insight={insight}
            duration={duration}
            isActive={activeInsightId === insight.id}
            onClick={() => {
              seekTo(insight.timestamp_start);
              setActiveInsightId(insight.id);
            }}
          />
        ))}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1 text-xs text-gray-500 font-mono">
        <span>0:00</span>
        <span>
          {duration
            ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
            : "--:--"}
        </span>
      </div>
    </div>
  );
}
