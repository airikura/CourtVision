import { API_BASE_URL } from "./constants";
import type { AuthResponse, UploadInitResponse, User, VideoSummary } from "@/types";

// ── Auth header helper ────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cv_token");
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // Clear stale token and redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem("cv_token");
      window.location.href = "/login";
    }
  }
  return res;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Registration failed: ${res.statusText}`);
  }
  return res.json();
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Login failed: ${res.statusText}`);
  }
  return res.json();
}

export async function googleAuth(idToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Google auth failed: ${res.statusText}`);
  }
  return res.json();
}

export async function getMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Invalid token");
  return res.json();
}

// ── Upload endpoints ──────────────────────────────────────────────────────────

export async function initUpload(
  filename: string,
  contentType: string,
  fileSizeBytes: number
): Promise<UploadInitResponse> {
  const res = await authFetch(`${API_BASE_URL}/upload/init`, {
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
  const res = await authFetch(`${API_BASE_URL}/upload/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Upload confirm failed: ${res.statusText}`);
}

// ── Library endpoints ─────────────────────────────────────────────────────────

export async function getVideoLibrary(): Promise<VideoSummary[]> {
  const res = await authFetch(`${API_BASE_URL}/library/videos`);
  if (!res.ok) throw new Error(`Failed to load library: ${res.statusText}`);
  return res.json();
}

export async function deleteVideo(videoId: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/library/videos/${videoId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete video: ${res.statusText}`);
}

// ── Export endpoints ──────────────────────────────────────────────────────────

export async function generatePracticePlan(
  sessionId: string,
  insightIds?: string[]
): Promise<string> {
  const res = await authFetch(`${API_BASE_URL}/export/practice-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, insight_ids: insightIds ?? null }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  const data = await res.json();
  return data.markdown as string;
}
