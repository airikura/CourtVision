from __future__ import annotations

import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from models.schemas import (
    UploadInitRequest,
    UploadInitResponse,
    UploadConfirmRequest,
    UploadConfirmResponse,
)
from services import gcs_service

router = APIRouter()

# In-memory session store (replace with Firestore/Redis in production)
_sessions: dict[str, dict] = {}


@router.post("/init", response_model=UploadInitResponse)
async def init_upload(body: UploadInitRequest):
    session_id = str(uuid.uuid4())

    _sessions[session_id] = {
        "status": "pending",
        "filename": body.filename,
        "content_type": body.content_type,
        "file_size_bytes": body.file_size_bytes,
    }

    return UploadInitResponse(session_id=session_id, upload_url=f"/upload/{session_id}/data")


@router.put("/{session_id}/data")
async def upload_data(session_id: str, file: UploadFile = File(...)):
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    data = await file.read()
    gcs_service.upload_blob(session_id, data, file.content_type or "video/mp4")
    _sessions[session_id]["status"] = "ready"

    return JSONResponse({"status": "ready"})


@router.post("/confirm", response_model=UploadConfirmResponse)
async def confirm_upload(body: UploadConfirmRequest):
    session = _sessions.get(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    _sessions[body.session_id]["status"] = "ready"
    return UploadConfirmResponse(status="ready")


def get_session(session_id: str) -> Optional[dict]:
    return _sessions.get(session_id)
