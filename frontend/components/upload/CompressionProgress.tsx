"use client";

import { useUploadStore } from "@/store/uploadSlice";

const PHASE_LABELS: Record<number, string> = {
  0: "Initializing FFmpeg...",
  10: "Extracting frames...",
  30: "Encoding video...",
  60: "Compressing audio...",
  85: "Finalizing output...",
  99: "Almost done...",
};

function getPhaseLabel(pct: number): string {
  const thresholds = Object.keys(PHASE_LABELS)
    .map(Number)
    .sort((a, b) => b - a);
  for (const t of thresholds) {
    if (pct >= t) return PHASE_LABELS[t];
  }
  return "Processing...";
}

export function CompressionProgress() {
  const { phase, compressionPct } = useUploadStore();
  if (phase !== "compressing") return null;

  return (
    <div className="w-full mt-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{getPhaseLabel(compressionPct)}</span>
        <span className="text-green-400 font-mono">{compressionPct}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${compressionPct}%` }}
        />
      </div>
    </div>
  );
}
