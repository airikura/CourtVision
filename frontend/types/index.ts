export type StrokeType =
  | "Serve"
  | "Forehand"
  | "Backhand"
  | "Volley"
  | "Footwork"
  | "Tactical";

export type IssueSeverity = "High" | "Medium" | "Low";

export type FilterType = StrokeType | null;

export interface Insight {
  id: string;
  timestamp_start: number;
  timestamp_end: number;
  stroke_type: StrokeType;
  issue_severity: IssueSeverity;
  analysis_text: string;
  correction_text: string;
}

export interface UploadInitResponse {
  session_id: string;
  upload_url: string; // GCS signed PUT URL
}

export type UploadPhase =
  | "idle"
  | "compressing"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export type StreamStatus = "idle" | "streaming" | "done" | "error";
