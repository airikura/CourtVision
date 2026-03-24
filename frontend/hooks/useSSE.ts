"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/constants";
import { useInsightsStore } from "@/store/insightsSlice";
import type { Insight } from "@/types";

export function useSSE(sessionId: string | null) {
  const { addInsight, setStreamStatus } = useInsightsStore();

  useEffect(() => {
    if (!sessionId) return;

    setStreamStatus("streaming");
    const es = new EventSource(
      `${API_BASE_URL}/analysis/${sessionId}/stream`
    );

    es.onmessage = (e) => {
      try {
        const insight: Insight = JSON.parse(e.data);
        addInsight(insight);
      } catch {
        // ignore malformed events
      }
    };

    es.addEventListener("done", () => {
      setStreamStatus("done");
      es.close();
    });

    es.addEventListener("error", (e) => {
      console.error("SSE error event:", e);
      setStreamStatus("error");
      es.close();
    });

    es.onerror = () => {
      setStreamStatus("error");
      es.close();
    };

    return () => {
      es.close();
    };
  }, [sessionId, addInsight, setStreamStatus]);
}
