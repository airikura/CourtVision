"use client";

import { useState } from "react";
import { SEVERITY_COLORS } from "@/lib/constants";
import { TimelineTooltip } from "./TimelineTooltip";
import type { Insight } from "@/types";

interface TimelineMarkerProps {
  insight: Insight;
  duration: number;
  isActive: boolean;
  onClick: () => void;
}

export function TimelineMarker({
  insight,
  duration,
  isActive,
  onClick,
}: TimelineMarkerProps) {
  const [hovered, setHovered] = useState(false);

  if (!duration) return null;

  const leftPct = (insight.timestamp_start / duration) * 100;
  const color = SEVERITY_COLORS[insight.issue_severity];

  return (
    <div
      className="absolute top-0 h-full flex flex-col justify-center items-center cursor-pointer group"
      style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`w-3 h-3 rounded-full transition-transform ${isActive ? "scale-150" : "group-hover:scale-125"}`}
        style={{
          backgroundColor: color,
          boxShadow: isActive ? `0 0 8px ${color}` : undefined,
        }}
      />
      {hovered && <TimelineTooltip insight={insight} />}
    </div>
  );
}
