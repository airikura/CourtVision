"use client";

import { usePlayerStore } from "@/store/playerSlice";
import { SEVERITY_BORDER, SEVERITY_TEXT } from "@/lib/constants";
import { SeverityBadge } from "@/components/ui/Badge";
import type { Insight } from "@/types";

interface InsightCardProps {
  insight: Insight;
  seekTo: (t: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function InsightCard({ insight, seekTo }: InsightCardProps) {
  const { activeInsightId, setActiveInsightId } = usePlayerStore();
  const isActive = activeInsightId === insight.id;

  const handleClick = () => {
    seekTo(insight.timestamp_start);
    setActiveInsightId(insight.id);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-gray-750 focus:outline-none
        ${isActive ? `border-l-4 bg-gray-800 ${SEVERITY_BORDER[insight.issue_severity]}` : "border border-gray-700 bg-gray-800/60 hover:bg-gray-800"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={insight.issue_severity} />
          <span className="text-xs text-gray-400">{insight.stroke_type}</span>
        </div>
        <span
          className={`text-xs font-mono ${SEVERITY_TEXT[insight.issue_severity]} hover:underline`}
        >
          {formatTime(insight.timestamp_start)}
        </span>
      </div>
      <p className="text-sm text-gray-200 leading-snug">{insight.analysis_text}</p>
      <p className="text-xs text-gray-500 mt-1.5 leading-snug">
        ↳ {insight.correction_text}
      </p>
    </button>
  );
}
