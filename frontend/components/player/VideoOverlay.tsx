"use client";

import { useEffect, useRef } from "react";
import { useOverlay } from "@/hooks/useOverlay";
import { useInsightsStore } from "@/store/insightsSlice";
import { usePlayerStore } from "@/store/playerSlice";

interface VideoOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function VideoOverlay({ containerRef }: VideoOverlayProps) {
  const insights = useInsightsStore((s) => s.insights);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const { canvasRef, syncSize } = useOverlay(insights, currentTime);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    syncSize(container);

    const observer = new ResizeObserver(() => syncSize(container));
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, syncSize]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
