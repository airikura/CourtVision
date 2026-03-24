"use client";

import { RefObject, useRef } from "react";
import { VideoOverlay } from "./VideoOverlay";
import { PlayerControls } from "./PlayerControls";

interface VideoPlayerProps {
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  togglePlay: () => void;
  setPlaybackRate: (rate: number) => void;
}

export function VideoPlayer({
  src,
  videoRef,
  togglePlay,
  setPlaybackRate,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden shadow-2xl border border-gray-700">
      <div ref={containerRef} className="relative bg-black flex-1 min-h-0">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain block"
          preload="metadata"
        />
        <VideoOverlay containerRef={containerRef} />
      </div>
      <PlayerControls
        togglePlay={togglePlay}
        setPlaybackRate={setPlaybackRate}
      />
    </div>
  );
}
