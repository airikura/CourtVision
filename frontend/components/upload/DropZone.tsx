"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useUploadStore } from "@/store/uploadSlice";
import { initUpload } from "@/lib/api";
import { uploadToBackend } from "@/lib/s3Upload";

export function DropZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { compress } = useFFmpeg();

  const {
    phase,
    setPhase,
    setCompressionPct,
    setUploadPct,
    setSessionId,
    setError,
  } = useUploadStore();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file.");
      return;
    }

    try {
      // Step 1: Init upload to get session_id + signed GCS URL
      // FFmpeg always outputs MP4, so we use video/mp4 regardless of input format
      const { session_id, upload_url } = await initUpload(
        file.name,
        "video/mp4",
        file.size
      );
      setSessionId(session_id);

      // Step 2: Compress in browser (output is always MP4)
      setPhase("compressing");
      const compressed = await compress(file, setCompressionPct);

      // Step 3: Upload to backend (which proxies to GCS)
      // upload_url is /upload/{session_id}/data — backend marks session ready on completion
      setPhase("uploading");
      await uploadToBackend(compressed, `${process.env.NEXT_PUBLIC_API_URL}${upload_url}`, setUploadPct);
      setPhase("done");
      router.push(`/analysis/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const isActive = phase !== "idle" && phase !== "error";

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full min-h-[380px] border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200
        ${isDragging ? "border-green-400 bg-green-900/20" : "border-gray-600 bg-gray-800/40 hover:border-gray-400"}
        ${isActive ? "pointer-events-none opacity-70" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !isActive && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFileChange}
      />
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="text-6xl">🎾</div>
        <h2 className="text-2xl font-bold text-white">
          Drop your match footage here
        </h2>
        <p className="text-gray-400 max-w-md">
          Upload your tennis match video for AI analysis. Files are compressed
          in your browser before upload — no raw 4K data leaves your device.
        </p>
        <p className="text-sm text-gray-500">
          Supports MP4, MOV, AVI, MKV · Up to 10GB
        </p>
      </div>
    </div>
  );
}
