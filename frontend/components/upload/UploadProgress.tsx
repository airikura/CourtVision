"use client";

import { useUploadStore } from "@/store/uploadSlice";

export function UploadProgress() {
  const { phase, uploadPct } = useUploadStore();
  if (phase !== "uploading") return null;

  return (
    <div className="w-full mt-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">Uploading to cloud...</span>
        <span className="text-blue-400 font-mono">{uploadPct}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${uploadPct}%` }}
        />
      </div>
    </div>
  );
}
