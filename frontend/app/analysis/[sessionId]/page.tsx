"use client";

import { useState, use, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Timeline } from "@/components/timeline/Timeline";
import { InsightsPanel } from "@/components/insights/InsightsPanel";
import { PracticePlanModal } from "@/components/export/PracticePlanModal";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/Button";
import { useInsightsStore } from "@/store/insightsSlice";
import { API_BASE_URL } from "@/lib/constants";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

function AnalysisContent({ sessionId }: { sessionId: string }) {
  const [showPlan, setShowPlan] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const handleRetry = useCallback(() => setRetryCount((n) => n + 1), []);

  const { videoRef, seekTo, togglePlay, stepFrame, setPlaybackRate } =
    useVideoPlayer();

  useSSE(sessionId, retryCount);
  useKeyboardShortcuts({ seekTo, togglePlay, stepFrame });

  const streamStatus = useInsightsStore((s) => s.streamStatus);

  const token = typeof window !== "undefined" ? localStorage.getItem("cv_token") : null;
  const videoSrc = token
    ? `${API_BASE_URL}/analysis/${sessionId}/video?token=${encodeURIComponent(token)}`
    : `${API_BASE_URL}/analysis/${sessionId}/video`;

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <a
          href="/library"
          className="text-sm font-bold text-green-400 hover:text-green-300"
        >
          ← CourtVision
        </a>
        <div className="flex items-center gap-3">
          {streamStatus === "done" && (
            <Button variant="secondary" onClick={() => setShowPlan(true)}>
              Generate Practice Plan
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        <div className="flex flex-col flex-1 gap-3 min-w-0">
          <div className="flex-1 min-h-0">
            <VideoPlayer
              src={videoSrc}
              videoRef={videoRef}
              togglePlay={togglePlay}
              setPlaybackRate={setPlaybackRate}
            />
          </div>
          <Timeline seekTo={seekTo} />

          <div className="flex gap-4 text-xs text-gray-600 px-1">
            <span>J = −10s</span>
            <span>K = play/pause</span>
            <span>L = +10s</span>
            <span>← → = frame</span>
            <span>F = footwork</span>
            <span>S = serve</span>
          </div>
        </div>

        <div className="w-96 shrink-0 flex flex-col">
          <InsightsPanel seekTo={seekTo} sessionId={sessionId} onRetry={handleRetry} />
        </div>
      </div>

      {showPlan && (
        <PracticePlanModal
          sessionId={sessionId}
          onClose={() => setShowPlan(false)}
        />
      )}
    </div>
  );
}

export default function AnalysisPage({ params }: PageProps) {
  const { sessionId } = use(params);
  return (
    <AuthGuard>
      <AnalysisContent sessionId={sessionId} />
    </AuthGuard>
  );
}
