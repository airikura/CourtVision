import { create } from "zustand";
import type { Insight, FilterType, StreamStatus } from "@/types";

interface InsightsState {
  insights: Insight[];
  streamStatus: StreamStatus;
  activeFilter: FilterType;
  addInsight: (insight: Insight) => void;
  setInsights: (insights: Insight[]) => void;
  setStreamStatus: (status: StreamStatus) => void;
  setActiveFilter: (filter: FilterType) => void;
  toggleFilter: (filter: Exclude<FilterType, null>) => void;
  filteredInsights: () => Insight[];
  reset: () => void;
}

export const useInsightsStore = create<InsightsState>((set, get) => ({
  insights: [],
  streamStatus: "idle",
  activeFilter: null,
  addInsight: (insight) =>
    set((state) => ({ insights: [...state.insights, insight] })),
  setInsights: (insights) => set({ insights }),
  setStreamStatus: (status) => set({ streamStatus: status }),
  reset: () => set({ insights: [], streamStatus: "idle", activeFilter: null }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  toggleFilter: (filter) =>
    set((state) => ({
      activeFilter: state.activeFilter === filter ? null : filter,
    })),
  filteredInsights: () => {
    const { insights, activeFilter } = get();
    if (!activeFilter) return insights;
    return insights.filter((i) => i.stroke_type === activeFilter);
  },
}));
