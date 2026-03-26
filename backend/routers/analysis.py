from __future__ import annotations

import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from database import get_db
from models.db_models import InsightRow, User, Video
from models.schemas import AnalysisResultsResponse, ChatRequest, ChatResponse, Insight
from services import gcs_service, gemini_service

router = APIRouter()


@router.get("/{session_id}/stream")
async def stream_analysis(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await _get_owned_video(session_id, current_user.id, db)
    if video.status not in ("ready", "analyzing", "error"):
        raise HTTPException(status_code=400, detail="Session not ready for analysis")

    video.status = "analyzing"
    await db.commit()

    analysis_context = {
        "player_name": video.player_name,
        "focus_areas": video.focus_areas,
        "problems": video.problems,
    }

    async def event_generator():
        insights = []
        try:
            async for insight in gemini_service.stream_analysis(session_id, context=analysis_context):
                insights.append(insight)
                yield f"data: {insight.model_dump_json()}\n\n"
        except Exception as e:
            # Roll back status on error
            async with db.begin_nested():
                video.status = "error"
            await db.commit()
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            return

        # Persist insights and mark done
        for ins in insights:
            row = InsightRow(
                id=ins.id or str(uuid.uuid4()),
                video_id=session_id,
                timestamp_start=ins.timestamp_start,
                timestamp_end=ins.timestamp_end,
                stroke_type=ins.stroke_type.value,
                issue_severity=ins.issue_severity.value,
                analysis_text=ins.analysis_text,
                correction_text=ins.correction_text,
            )
            db.add(row)
        video.status = "done"
        await db.commit()
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/{session_id}/video")
async def get_video(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_video(session_id, current_user.id, db)

    try:
        data = await asyncio.to_thread(gcs_service.download_blob, session_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found")

    total = len(data)
    range_header = request.headers.get("range")

    if range_header:
        byte_range = range_header.replace("bytes=", "").split("-")
        start = int(byte_range[0])
        end = int(byte_range[1]) if byte_range[1] else total - 1
        end = min(end, total - 1)
        chunk = data[start : end + 1]

        return Response(
            content=chunk,
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range": f"bytes {start}-{end}/{total}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(chunk)),
                "Cross-Origin-Resource-Policy": "cross-origin",
            },
        )

    return Response(
        content=data,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(total),
            "Cross-Origin-Resource-Policy": "cross-origin",
        },
    )


@router.get("/{session_id}/results", response_model=AnalysisResultsResponse)
async def get_results(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await _get_owned_video(session_id, current_user.id, db)

    if video.status == "done":
        result = await db.execute(
            select(InsightRow).where(InsightRow.video_id == session_id)
        )
        rows = result.scalars().all()
        insights = [_row_to_insight(r) for r in rows]
        return AnalysisResultsResponse(insights=insights, status="done")

    status = video.status if video.status in ("streaming", "error") else "streaming"
    return AnalysisResultsResponse(insights=[], status=status)


@router.post("/{session_id}/chat", response_model=ChatResponse)
async def chat_about_analysis(
    session_id: str,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await _get_owned_video(session_id, current_user.id, db)

    result = await db.execute(
        select(InsightRow).where(InsightRow.video_id == session_id)
    )
    rows = result.scalars().all()
    insights = [_row_to_insight(r) for r in rows]

    player_context = {
        "player_name": video.player_name,
        "focus_areas": video.focus_areas,
        "problems": video.problems,
    }

    history = [{"role": m.role, "content": m.content} for m in body.history]
    reply = await gemini_service.generate_chat_response(
        insights=insights,
        player_context=player_context,
        message=body.message,
        history=history,
    )
    return ChatResponse(reply=reply)


def _row_to_insight(row: InsightRow) -> Insight:
    return Insight(
        id=row.id,
        timestamp_start=row.timestamp_start,
        timestamp_end=row.timestamp_end,
        stroke_type=row.stroke_type,
        issue_severity=row.issue_severity,
        analysis_text=row.analysis_text,
        correction_text=row.correction_text,
    )


async def _get_owned_video(session_id: str, user_id: str, db: AsyncSession) -> Video:
    result = await db.execute(
        select(Video).where(Video.id == session_id, Video.user_id == user_id)
    )
    video = result.scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return video
