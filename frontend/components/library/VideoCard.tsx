"use client";

import Link from "next/link";
import type { VideoSummary } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  done: "bg-green-900/40 text-green-400 border-green-800",
  analyzing: "bg-blue-900/40 text-blue-400 border-blue-800",
  ready: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  pending: "bg-gray-700/40 text-gray-400 border-gray-600",
  error: "bg-red-900/40 text-red-400 border-red-800",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  video: VideoSummary;
  onDelete: (id: string) => void;
}

export function VideoCard({ video, onDelete }: Props) {
  const statusStyle = STATUS_STYLES[video.status] ?? STATUS_STYLES.pending;
  const isClickable = video.status === "done" || video.status === "analyzing";

  const cardContent = (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white truncate" title={video.filename}>
          {video.filename}
        </p>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(video.id);
          }}
          className="text-gray-600 hover:text-red-400 transition-colors text-xs shrink-0"
          aria-label="Delete video"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded border ${statusStyle}`}>
          {video.status}
        </span>
        {video.status === "done" && (
          <span className="text-xs text-gray-500">{video.insight_count} insights</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{formatDate(video.created_at)}</span>
        <span>{formatBytes(video.file_size_bytes)}</span>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <Link href={`/analysis/${video.id}`} className="block">
        {cardContent}
      </Link>
    );
  }

  return <div>{cardContent}</div>;
}
