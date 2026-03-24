import type { IssueSeverity, StrokeType } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  High: "#ef4444",   // red-500
  Medium: "#f59e0b", // amber-500
  Low: "#3b82f6",    // blue-500
};

export const SEVERITY_BG: Record<IssueSeverity, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-blue-500",
};

export const SEVERITY_BORDER: Record<IssueSeverity, string> = {
  High: "border-red-500",
  Medium: "border-amber-500",
  Low: "border-blue-500",
};

export const SEVERITY_TEXT: Record<IssueSeverity, string> = {
  High: "text-red-400",
  Medium: "text-amber-400",
  Low: "text-blue-400",
};

export const STROKE_FILTERS: StrokeType[] = [
  "Serve",
  "Forehand",
  "Backhand",
  "Volley",
  "Footwork",
  "Tactical",
];

export const DEFAULT_FPS = 30;
