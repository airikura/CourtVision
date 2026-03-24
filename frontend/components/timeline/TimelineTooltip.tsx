import type { Insight } from "@/types";

interface TimelineTooltipProps {
  insight: Insight;
}

export function TimelineTooltip({ insight }: TimelineTooltipProps) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 border border-gray-600 rounded p-2 text-xs text-gray-200 shadow-xl z-50 pointer-events-none">
      <div className="font-bold text-white">{insight.stroke_type}</div>
      <div className="text-gray-400 mt-0.5 truncate">{insight.analysis_text}</div>
    </div>
  );
}
