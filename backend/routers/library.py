from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from database import get_db
from models.db_models import InsightRow, User, Video
from services import gcs_service

router = APIRouter()


class VideoSummary(BaseModel):
    id: str
    filename: str
    status: str
    file_size_bytes: int
    insight_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoDetail(BaseModel):
    id: str
    filename: str
    status: str
    file_size_bytes: int
    created_at: datetime
    insights: List[InsightOut]

    model_config = {"from_attributes": True}


class InsightOut(BaseModel):
    id: str
    timestamp_start: float
    timestamp_end: float
    stroke_type: str
    issue_severity: str
    analysis_text: str
    correction_text: str

    model_config = {"from_attributes": True}


VideoDetail.model_rebuild()


@router.get("/videos", response_model=List[VideoSummary])
async def list_videos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch videos with insight counts in one query
    result = await db.execute(
        select(
            Video,
            func.count(InsightRow.id).label("insight_count"),
        )
        .outerjoin(InsightRow, InsightRow.video_id == Video.id)
        .where(Video.user_id == current_user.id)
        .group_by(Video.id)
        .order_by(Video.created_at.desc())
    )
    rows = result.all()

    return [
        VideoSummary(
            id=v.id,
            filename=v.filename,
            status=v.status,
            file_size_bytes=v.file_size_bytes,
            insight_count=count,
            created_at=v.created_at,
        )
        for v, count in rows
    ]


@router.get("/videos/{video_id}", response_model=VideoDetail)
async def get_video_detail(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    result = await db.execute(
        select(InsightRow).where(InsightRow.video_id == video_id)
    )
    insight_rows = result.scalars().all()

    return VideoDetail(
        id=video.id,
        filename=video.filename,
        status=video.status,
        file_size_bytes=video.file_size_bytes,
        created_at=video.created_at,
        insights=[InsightOut.model_validate(r) for r in insight_rows],
    )


@router.delete("/videos/{video_id}", status_code=204)
async def delete_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete insights first
    result = await db.execute(select(InsightRow).where(InsightRow.video_id == video_id))
    for row in result.scalars().all():
        await db.delete(row)

    await db.delete(video)
    await db.commit()

    # Best-effort GCS cleanup
    try:
        gcs_service.delete_blob(video_id)
    except Exception:
        pass
