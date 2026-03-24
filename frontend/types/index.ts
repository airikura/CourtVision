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

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface VideoSummary {
  id: string;
  filename: string;
  status: string;
  file_size_bytes: number;
  insight_count: number;
  created_at: string;
}
