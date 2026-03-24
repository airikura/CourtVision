"use client";

import { useInsightsStore } from "@/store/insightsSlice";

const PHASE_MESSAGES = [
  "Analyzing footwork...",
  "Reviewing stroke mechanics...",
  "Identifying tactical patterns...",
  "Evaluating serve technique...",
  "Assessing court positioning...",
];

export function StreamingIndicator() {
  const streamStatus = useInsightsStore((s) => s.streamStatus);
  if (streamStatus !== "streaming") return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg text-sm text-green-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      Analyzing match footage...
    </div>
  );
}
