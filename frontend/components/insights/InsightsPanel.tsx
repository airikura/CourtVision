"use client";

import { useEffect, useRef } from "react";
import { useInsightsStore } from "@/store/insightsSlice";
import { usePlayerStore } from "@/store/playerSlice";
import { InsightFilters } from "./InsightFilters";
import { InsightCard } from "./InsightCard";
import { StreamingIndicator } from "./StreamingIndicator";

interface InsightsPanelProps {
  seekTo: (t: number) => void;
}

export function InsightsPanel({ seekTo }: InsightsPanelProps) {
  const { filteredInsights, insights, streamStatus } = useInsightsStore();
  const activeInsightId = usePlayerStore((s) => s.activeInsightId);
  const activeCardRef = useRef<HTMLDivElement>(null);

  const displayed = filteredInsights();

  // Auto-scroll to active insight
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeInsightId]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-white">
          Insights
          {insights.length > 0 && (
            <span className="ml-2 text-gray-400 font-normal">
              ({insights.length})
            </span>
          )}
        </h2>
        {streamStatus === "done" && (
          <span className="text-xs text-green-400">Analysis complete</span>
        )}
        {streamStatus === "error" && (
          <span className="text-xs text-red-400">Analysis failed</span>
        )}
      </div>

      {/* Filters */}
      <InsightFilters />

      {/* Streaming indicator */}
      <div className="px-2 pb-1">
        <StreamingIndicator />
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {displayed.length === 0 && streamStatus === "idle" && (
          <p className="text-gray-500 text-sm text-center py-8">
            Insights will appear here as the AI analyzes your footage.
          </p>
        )}
        {displayed.map((insight) => (
          <div
            key={insight.id}
            ref={activeInsightId === insight.id ? activeCardRef : undefined}
          >
            <InsightCard insight={insight} seekTo={seekTo} />
          </div>
        ))}
      </div>
    </div>
  );
}
