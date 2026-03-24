"use client";

import { useState, useCallback } from "react";
import { compressVideo } from "@/lib/ffmpegCompress";

export function useFFmpeg() {
  const [isLoading, setIsLoading] = useState(false);

  const compress = useCallback(
    async (
      file: File,
      onProgress: (pct: number) => void
    ): Promise<Blob> => {
      setIsLoading(true);
      try {
        return await compressVideo(file, onProgress);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { compress, isLoading };
}
