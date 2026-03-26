from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from database import get_db
from models.db_models import User, Video
from models.schemas import (
    UploadInitRequest,
    UploadInitResponse,
    UploadConfirmRequest,
    UploadConfirmResponse,
)
from services import gcs_service

router = APIRouter()


MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


@router.post("/init", response_model=UploadInitResponse)
async def init_upload(
    body: UploadInitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.file_size_bytes > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 100 MB limit.")

    session_id = str(uuid.uuid4())
    gcs_path = f"uploads/{session_id}/video"

    video = Video(
        id=session_id,
        user_id=current_user.id,
        filename=body.filename,
        content_type=body.content_type,
        file_size_bytes=body.file_size_bytes,
        status="pending",
        gcs_path=gcs_path,
        player_name=body.player_name,
        focus_areas=body.focus_areas,
        problems=body.problems,
    )
    db.add(video)
    await db.commit()

    return UploadInitResponse(session_id=session_id, upload_url=f"/upload/{session_id}/data")


@router.put("/{session_id}/data")
async def upload_data(
    session_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await _get_owned_video(session_id, current_user.id, db)

    data = await file.read()
    gcs_service.upload_blob(session_id, data, file.content_type or "video/mp4")

    video.status = "ready"
    await db.commit()

    return JSONResponse({"status": "ready"})


@router.post("/confirm", response_model=UploadConfirmResponse)
async def confirm_upload(
    body: UploadConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await _get_owned_video(body.session_id, current_user.id, db)
    video.status = "ready"
    await db.commit()
    return UploadConfirmResponse(status="ready")


async def _get_owned_video(session_id: str, user_id: str, db: AsyncSession) -> Video:
    result = await db.execute(
        select(Video).where(Video.id == session_id, Video.user_id == user_id)
    )
    video = result.scalar_one_or_none()
    if video is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return video


async def get_session(session_id: str, db: AsyncSession):
    """Used by analysis.py to check session status."""
    result = await db.execute(select(Video).where(Video.id == session_id))
    video = result.scalar_one_or_none()
    if video is None:
        return None
    return {"status": video.status, "filename": video.filename}
