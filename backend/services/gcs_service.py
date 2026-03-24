"""
Google Cloud Storage service.
Upload is proxied through FastAPI (browser → FastAPI → GCS) to avoid CORS issues.
Download is also proxied for the same reason.
"""
from __future__ import annotations

import os
from google.cloud import storage
from google.auth.transport.requests import Request
from google.auth import default as google_auth_default
from core.config import settings

_client = None
_credentials = None


def get_client() -> storage.Client:
    global _client
    if _client is None:
        creds_path = settings.google_application_credentials
        if creds_path:
            os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", creds_path)
        _client = storage.Client()
    return _client


def upload_blob(session_id: str, data: bytes, content_type: str) -> None:
    """Upload video bytes directly to GCS."""
    client = get_client()
    bucket = client.bucket(settings.gcs_bucket_name)
    blob = bucket.blob(f"uploads/{session_id}/video")
    blob.upload_from_string(data, content_type=content_type)


def download_blob(session_id: str) -> bytes:
    """Download video bytes from GCS."""
    client = get_client()
    bucket = client.bucket(settings.gcs_bucket_name)
    blob = bucket.blob(f"uploads/{session_id}/video")
    return blob.download_as_bytes()


def open_blob_stream(session_id: str):
    """Return a readable stream for the video blob."""
    client = get_client()
    bucket = client.bucket(settings.gcs_bucket_name)
    blob = bucket.blob(f"uploads/{session_id}/video")
    return blob.open("rb")


def delete_blob(session_id: str) -> None:
    """Delete video blob from GCS."""
    client = get_client()
    bucket = client.bucket(settings.gcs_bucket_name)
    blob = bucket.blob(f"uploads/{session_id}/video")
    blob.delete()
