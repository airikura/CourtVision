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

ANALYSIS_PROMPT = """Analyze this tennis video footage carefully. Return a JSON array of findings where each element matches this exact schema:

[{
  "timestamp_start": <float seconds from start of video>,
  "timestamp_end": <float seconds>,
  "stroke_type": "<Serve|Forehand|Backhand|Volley|Footwork|Tactical>",
  "issue_severity": "<High|Medium|Low>",
  "analysis_text": "<specific description of what is happening in this moment>",
  "correction_text": "<specific, actionable correction the player can practice>"
}]

Confidence and quality rules — strictly enforce these:
- Only include findings you can directly and clearly observe in the footage. If you are uncertain, skip it.
- Do not speculate about things that are partially obscured, ambiguous, or not clearly visible.
- Prefer fewer, high-confidence findings over many weak observations.
- Each finding must be grounded in a specific, visually identifiable moment — not a general pattern.

Severity definitions:
- High: clear mechanical error directly causing point loss or injury risk
- Medium: technical flaw that observably reduces shot effectiveness
- Low: tactical opportunity with a concrete alternative that was available

Additional guidelines:
- Be precise with timestamps — the start/end window should tightly bracket the exact moment
- analysis_text describes what you see; correction_text is a single actionable fix
- Return ONLY the JSON array, no markdown fences, no prose, no explanation"""


def _make_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _build_analysis_prompt(context: dict | None) -> str:
    if not context:
        return ANALYSIS_PROMPT
    lines = []
    if context.get("player_name"):
        lines.append(f"Player: {context['player_name']}")
    if context.get("focus_areas"):
        lines.append(f"Focus areas: {context['focus_areas']}")
    if context.get("problems"):
        lines.append(f"Player-reported problems: {context['problems']}")
    if not lines:
        return ANALYSIS_PROMPT
    context_block = "Player context (use this to weight your analysis — prioritise the stated focus areas and problems):\n" + "\n".join(lines)
    return context_block + "\n\n" + ANALYSIS_PROMPT


async def stream_analysis(session_id: str, context: dict | None = None) -> AsyncIterator[Insight]:
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
        video_part = types.Part(
            file_data=types.FileData(
                file_uri=gemini_file.uri,
                mime_type="video/mp4",
            ),
            video_metadata=types.VideoMetadata(fps=24),
        )

        prompt = _build_analysis_prompt(context)
        response_iter = await asyncio.to_thread(
            client.models.generate_content_stream,
            model="gemini-3-flash-preview",
            contents=[video_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                media_resolution=types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            ),
        )

        # 7. Incrementally parse and yield complete Insight objects
        async for insight in parse_stream(response_iter):
            yield insight

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)



CUES_PROMPT_TEMPLATE = """You are a tennis coach writing brief mental cues for a player to recall during a match.

Based on these corrections grouped by stroke type, write 2-3 short memorable cues per stroke — things the player can quickly think of between points. Each cue should be 3-8 words maximum, phrased as a positive action or focus word (e.g. "Turn early", "Step into the ball", "Split step first").

Corrections:
{corrections}

Return markdown only: ## headers for each stroke type, bullet points for cues. No prose, no intro, no explanation."""


async def generate_match_cues(groups: dict[str, list[str]]) -> str:
    """Given a dict of stroke_type -> [correction_text, ...], return a cues markdown string."""
    corrections_text = ""
    for stroke, corrections in sorted(groups.items()):
        corrections_text += f"\n{stroke}:\n"
        for c in corrections:
            corrections_text += f"  - {c}\n"

    prompt = CUES_PROMPT_TEMPLATE.format(corrections=corrections_text.strip())
    client = _make_client()
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-3-flash-preview",
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.4),
    )
    return response.text.strip()


DRILLS_PROMPT_TEMPLATE = """You are an experienced tennis coach designing a targeted training program.

Based on these technical issues and corrections grouped by stroke type, create a structured drill plan with both on-court and off-court exercises. Each drill should directly address one or more of the identified issues.

Issues and corrections:
{corrections}

Return markdown only with this exact structure:
# Drills

## On-Court Drills
For each drill: ### drill name, then a brief description (1-2 sentences), then a "**Targets:**" line listing the stroke types it addresses.

## Off-Court Training
For each exercise: ### exercise name, then a brief description (1-2 sentences), then a "**Targets:**" line.

Aim for 3-4 on-court drills and 2-3 off-court exercises. Be specific and practical. No intro prose, no summary."""


async def generate_drills(groups: dict[str, list[str]]) -> str:
    """Given a dict of stroke_type -> [correction_text, ...], return a drills markdown string."""
    corrections_text = ""
    for stroke, corrections in sorted(groups.items()):
        corrections_text += f"\n{stroke}:\n"
        for c in corrections:
            corrections_text += f"  - {c}\n"

    prompt = DRILLS_PROMPT_TEMPLATE.format(corrections=corrections_text.strip())
    client = _make_client()
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-3-flash-preview",
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.4),
    )
    return response.text.strip()


CHAT_SYSTEM_PROMPT = """You are a tennis coach assistant reviewing a player's match footage analysis. Answer the player's questions using the insights below. Be specific, practical, and refer to timestamps where relevant (format as e.g. "at 1:23").

{player_context}Insights from the analysis:
{insights_summary}

If a question isn't covered by the analysis, say so clearly and offer general advice. Keep answers concise."""


async def generate_chat_response(
    insights: list,
    player_context: dict | None,
    message: str,
    history: list[dict],
) -> str:
    """Answer a follow-up question about the analysis using the insights as context."""
    # Build context block
    ctx_lines = []
    if player_context:
        if player_context.get("player_name"):
            ctx_lines.append(f"Player: {player_context['player_name']}")
        if player_context.get("focus_areas"):
            ctx_lines.append(f"Focus areas: {player_context['focus_areas']}")
        if player_context.get("problems"):
            ctx_lines.append(f"Player-reported problems: {player_context['problems']}")
    player_ctx_block = ("\n".join(ctx_lines) + "\n\n") if ctx_lines else ""

    insights_lines = []
    for ins in insights:
        m = int(ins.timestamp_start // 60)
        s = int(ins.timestamp_start % 60)
        ts = f"{m}:{s:02d}"
        insights_lines.append(
            f"- [{ts}] {ins.stroke_type} ({ins.issue_severity}): {ins.analysis_text} → {ins.correction_text}"
        )
    insights_block = "\n".join(insights_lines) if insights_lines else "No insights available yet."

    system_prompt = CHAT_SYSTEM_PROMPT.format(
        player_context=player_ctx_block,
        insights_summary=insights_block,
    )

    # Build conversation turns
    contents = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    client = _make_client()
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-3-flash-preview",
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.4,
        ),
    )
    return response.text.strip()


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
