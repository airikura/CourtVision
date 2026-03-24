"use client";

import { useState, use } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Timeline } from "@/components/timeline/Timeline";
import { InsightsPanel } from "@/components/insights/InsightsPanel";
import { PracticePlanModal } from "@/components/export/PracticePlanModal";
import { Button } from "@/components/ui/Button";
import { useInsightsStore } from "@/store/insightsSlice";
import { API_BASE_URL } from "@/lib/constants";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function AnalysisPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const [showPlan, setShowPlan] = useState(false);

  // All video player controls live here so keyboard shortcuts and timeline
  // can share the same seekTo/togglePlay functions.
  const { videoRef, seekTo, togglePlay, stepFrame, setPlaybackRate } =
    useVideoPlayer();

  // Start SSE streaming for this session
  useSSE(sessionId);

  // Global keyboard shortcuts
  useKeyboardShortcuts({ seekTo, togglePlay, stepFrame });

  const streamStatus = useInsightsStore((s) => s.streamStatus);

  // The backend serves a redirect to a presigned S3 URL
  const videoSrc = `${API_BASE_URL}/analysis/${sessionId}/video`;

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <a
          href="/upload"
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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        {/* Left: Video + Timeline */}
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

          {/* Keyboard shortcut hints */}
          <div className="flex gap-4 text-xs text-gray-600 px-1">
            <span>J = −10s</span>
            <span>K = play/pause</span>
            <span>L = +10s</span>
            <span>← → = frame</span>
            <span>F = footwork</span>
            <span>S = serve</span>
          </div>
        </div>

        {/* Right: Insights Panel */}
        <div className="w-96 shrink-0 flex flex-col">
          <InsightsPanel seekTo={seekTo} />
        </div>
      </div>

      {/* Practice Plan Modal */}
      {showPlan && (
        <PracticePlanModal
          sessionId={sessionId}
          onClose={() => setShowPlan(false)}
        />
      )}
    </div>
  );
}
