"use client";

import { useEffect, useRef, useCallback } from "react";
import { SEVERITY_COLORS } from "@/lib/constants";
import type { Insight } from "@/types";

export function useOverlay(insights: Insight[], currentTime: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const active = insights.filter(
      (i) => i.timestamp_start <= currentTime && i.timestamp_end >= currentTime
    );

    if (active.length === 0) return;

    // Draw from lowest to highest severity so High is on top
    const sorted = [...active].sort((a, b) => {
      const order = { Low: 0, Medium: 1, High: 2 };
      return order[a.issue_severity] - order[b.issue_severity];
    });

    // For MVP: draw a color-coded banner at top of frame + label
    sorted.forEach((insight, idx) => {
      const color = SEVERITY_COLORS[insight.issue_severity];
      const bannerH = 36;
      const y = idx * (bannerH + 2);

      ctx.fillStyle = color + "CC"; // ~80% opacity
      ctx.fillRect(0, y, canvas.width, bannerH);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Inter, system-ui, sans-serif";
      ctx.fillText(
        `${insight.stroke_type} · ${insight.issue_severity}: ${insight.analysis_text}`,
        10,
        y + 24
      );
    });
  }, [insights, currentTime]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Resize canvas to match container
  const syncSize = useCallback((container: HTMLElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
  }, [draw]);

  return { canvasRef, syncSize };
}
