"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/constants";
import { useInsightsStore } from "@/store/insightsSlice";
import { getAnalysisResults } from "@/lib/api";
import type { Insight } from "@/types";

export function useSSE(sessionId: string | null, retryCount = 0) {
  const { addInsight, setInsights, setStreamStatus, reset } = useInsightsStore();

  useEffect(() => {
    if (!sessionId) return;

    reset();

    let cancelled = false;

    async function start() {
      // Check if analysis already exists in the DB
      const results = await getAnalysisResults(sessionId!);
      if (cancelled) return;

      if (results.status === "done") {
        setInsights(results.insights);
        setStreamStatus("done");
        return;
      }

      // Not done — open SSE stream
      setStreamStatus("streaming");
      const token = typeof window !== "undefined" ? localStorage.getItem("cv_token") : null;
      const url = token
        ? `${API_BASE_URL}/analysis/${sessionId}/stream?token=${encodeURIComponent(token)}`
        : `${API_BASE_URL}/analysis/${sessionId}/stream`;
      const es = new EventSource(url);

      es.onmessage = (e) => {
        if (cancelled) { es.close(); return; }
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

      es.addEventListener("error", () => {
        setStreamStatus("error");
        es.close();
      });

      es.onerror = () => {
        if (!cancelled) setStreamStatus("error");
        es.close();
      };

      // Store cleanup ref on the effect's closure
      cleanupRef = () => es.close();
    }

    let cleanupRef = () => {};
    start();

    return () => {
      cancelled = true;
      cleanupRef();
    };
  }, [sessionId, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps
}
