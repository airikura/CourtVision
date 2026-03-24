"""
Gemini 1.5 Pro multimodal video analysis service.
Uses the google-genai SDK (successor to google-generativeai).
Downloads video from S3, uploads to Gemini File API, streams analysis.
"""
from __future__ import annotations

import asyncio
import time
import tempfile
import os
from typing import AsyncIterator

from google import genai
from google.genai import types
import httpx

from core.config import settings
from models.schemas import Insight
from services import gcs_service
from services.analysis_parser import parse_stream

ANALYSIS_PROMPT = """Analyze this tennis video footage carefully. For every technically significant moment
(stroke errors, footwork issues, tactical patterns, preparation problems, contact point issues, recovery positioning),
return a JSON array where each element matches this exact schema:

[{
  "timestamp_start": <float seconds from start of video>,
  "timestamp_end": <float seconds>,
  "stroke_type": "<Serve|Forehand|Backhand|Volley|Footwork|Tactical>",
  "issue_severity": "<High|Medium|Low>",
  "analysis_text": "<specific description of what is happening in this moment>",
  "correction_text": "<specific, actionable correction the player can practice>"
}]

Guidelines:
- High severity: mechanical errors that cause immediate point loss or injury risk
- Medium severity: technical flaws that reduce effectiveness
- Low severity: tactical patterns and optimization opportunities
- Be specific with timestamps — pinpoint the exact moment the issue occurs
- Aim for 10-20 insights for a typical rally or match excerpt
- Return ONLY the JSON array, no markdown fences, no prose, no explanation"""


def _make_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


async def stream_analysis(session_id: str) -> AsyncIterator[Insight]:
    """
    Main entry point: S3 download → Gemini File API upload → streaming analysis.
    Yields Insight objects one by one.
    """
    client = _make_client()

    # 1. Download video from GCS to temp file

    # 2. Download video to a temp file (Gemini File API needs a local file or path)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        data = await asyncio.to_thread(gcs_service.download_blob, session_id)
        with open(tmp_path, "wb") as f:
            f.write(data)

        # 3. Upload to Gemini File API
        gemini_file = await asyncio.to_thread(
            client.files.upload,
            file=tmp_path,
            config=types.UploadFileConfig(mime_type="video/mp4"),
        )

        # 4. Wait for Gemini to finish processing the file
        await _wait_for_file_active(client, gemini_file.name)

        # 5. Refresh file reference after processing
        gemini_file = await asyncio.to_thread(client.files.get, name=gemini_file.name)

        # 6. Stream generation
        response_iter = await asyncio.to_thread(
            client.models.generate_content_stream,
            model="gemini-3-flash-preview",
            contents=[gemini_file, ANALYSIS_PROMPT],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        # 7. Incrementally parse and yield complete Insight objects
        async for insight in parse_stream(response_iter):
            yield insight

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)



async def _wait_for_file_active(
    client: genai.Client,
    file_name: str,
    max_wait: int = 300,
    poll_interval: int = 5,
) -> None:
    """Poll Gemini File API until the file state is ACTIVE."""
    start = time.time()
    while True:
        file_info = await asyncio.to_thread(client.files.get, name=file_name)
        state = getattr(file_info, "state", None)
        state_name = state.name if hasattr(state, "name") else str(state)

        if state_name == "ACTIVE":
            return
        if state_name == "FAILED":
            raise RuntimeError(f"Gemini file processing failed for {file_name}")
        if time.time() - start > max_wait:
            raise TimeoutError("Timed out waiting for Gemini file to become ACTIVE")

        await asyncio.sleep(poll_interval)
