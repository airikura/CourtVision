"use client";

import { STROKE_FILTERS } from "@/lib/constants";
import { useInsightsStore } from "@/store/insightsSlice";
import type { StrokeType } from "@/types";

export function InsightFilters() {
  const { activeFilter, toggleFilter, setActiveFilter } = useInsightsStore();

  return (
    <div className="flex flex-wrap gap-1.5 p-2">
      <button
        onClick={() => setActiveFilter(null)}
        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
          activeFilter === null
            ? "bg-white text-gray-900"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
      >
        All
      </button>
      {STROKE_FILTERS.map((stroke) => (
        <button
          key={stroke}
          onClick={() => toggleFilter(stroke as StrokeType)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeFilter === stroke
              ? "bg-white text-gray-900"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {stroke}
          {stroke === "Footwork" && (
            <span className="ml-1 text-gray-500">[F]</span>
          )}
          {stroke === "Serve" && (
            <span className="ml-1 text-gray-500">[S]</span>
          )}
        </button>
      ))}
    </div>
  );
}
