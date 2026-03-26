"use client";

import { useRef, useState, DragEvent, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useUploadStore } from "@/store/uploadSlice";
import { initUpload } from "@/lib/api";
import { uploadToBackend } from "@/lib/s3Upload";

const STROKE_TYPES = ["Serve", "Forehand", "Backhand", "Volley", "Footwork", "Tactical"] as const;

interface UploadContext {
  playerName: string;
  focusAreas: string[];
  problems: string;
}

export function DropZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [context, setContext] = useState<UploadContext>({
    playerName: "",
    focusAreas: [],
    problems: "",
  });
  const { compress } = useFFmpeg();

  const {
    phase,
    setPhase,
    setCompressionPct,
    setUploadPct,
    setSessionId,
    setError,
  } = useUploadStore();

  const startUpload = async (file: File, ctx: UploadContext) => {
    try {
      const focusAreasStr = ctx.focusAreas.length > 0 ? ctx.focusAreas.join(", ") : undefined;
      const { session_id, upload_url } = await initUpload(
        file.name,
        "video/mp4",
        file.size,
        {
          playerName: ctx.playerName || undefined,
          focusAreas: focusAreasStr,
          problems: ctx.problems || undefined,
        }
      );
      setSessionId(session_id);

      setPhase("compressing");
      const compressed = await compress(file, setCompressionPct);

      setPhase("uploading");
      await uploadToBackend(compressed, `${process.env.NEXT_PUBLIC_API_URL}${upload_url}`, setUploadPct);
      setPhase("done");
      router.push(`/analysis/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

  const onFilePicked = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds the 100 MB limit. Please trim or compress your video first.");
      return;
    }
    setPendingFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFilePicked(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFilePicked(file);
  };

  const onContextSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pendingFile) startUpload(pendingFile, context);
  };

  const toggleFocusArea = (area: string) => {
    setContext((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter((a) => a !== area)
        : [...prev.focusAreas, area],
    }));
  };

  const isActive = phase !== "idle" && phase !== "error";

  // Context form — shown after a file is selected
  if (pendingFile && phase === "idle") {
    return (
      <div className="w-full rounded-2xl border border-gray-700 bg-gray-800/40 p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-900/40 text-green-400">
            ✓
          </div>
          <div>
            <p className="text-sm text-gray-400">Selected file</p>
            <p className="font-medium text-white truncate max-w-xs">{pendingFile.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="ml-auto text-sm text-gray-500 hover:text-gray-300"
          >
            Change
          </button>
        </div>

        <form onSubmit={onContextSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Your name <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={context.playerName}
              onChange={(e) => setContext((prev) => ({ ...prev, playerName: e.target.value }))}
              className="w-full rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">
              Focus areas <span className="text-gray-500">(optional — select any)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {STROKE_TYPES.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleFocusArea(area)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    context.focusAreas.includes(area)
                      ? "bg-green-600 text-white"
                      : "border border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              What problems are you experiencing? <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              placeholder="e.g. I keep double-faulting on second serves and my backhand breaks down under pressure"
              value={context.problems}
              onChange={(e) => setContext((prev) => ({ ...prev, problems: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 transition-colors"
          >
            Start Analysis
          </button>
        </form>
      </div>
    );
  }

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
          Supports MP4, MOV, AVI, MKV · Up to 100 MB
        </p>
      </div>
    </div>
  );
}
