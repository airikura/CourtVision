import { API_BASE_URL } from "./constants";
import type { UploadInitResponse } from "@/types";

export async function initUpload(
  filename: string,
  contentType: string,
  fileSizeBytes: number
): Promise<UploadInitResponse> {
  const res = await fetch(`${API_BASE_URL}/upload/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      content_type: contentType,
      file_size_bytes: fileSizeBytes,
    }),
  });
  if (!res.ok) throw new Error(`Upload init failed: ${res.statusText}`);
  return res.json();
}

export async function confirmUpload(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/upload/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Upload confirm failed: ${res.statusText}`);
}

export async function generatePracticePlan(
  sessionId: string,
  insightIds?: string[]
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/export/practice-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, insight_ids: insightIds ?? null }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  const data = await res.json();
  return data.markdown as string;
}
