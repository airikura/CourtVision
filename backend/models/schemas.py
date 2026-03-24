from __future__ import annotations

from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid


class StrokeType(str, Enum):
    serve = "Serve"
    forehand = "Forehand"
    backhand = "Backhand"
    volley = "Volley"
    footwork = "Footwork"
    tactical = "Tactical"


class IssueSeverity(str, Enum):
    high = "High"
    medium = "Medium"
    low = "Low"


class Insight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp_start: float
    timestamp_end: float
    stroke_type: StrokeType
    issue_severity: IssueSeverity
    analysis_text: str
    correction_text: str


class UploadInitRequest(BaseModel):
    filename: str
    content_type: str
    file_size_bytes: int


class UploadInitResponse(BaseModel):
    session_id: str
    upload_url: str  # GCS signed PUT URL — browser uploads directly via PUT


class UploadConfirmRequest(BaseModel):
    session_id: str


class UploadConfirmResponse(BaseModel):
    status: Literal["ready"]


class AnalysisResultsResponse(BaseModel):
    insights: list[Insight]
    status: Literal["done", "streaming", "error"]


class PracticePlanRequest(BaseModel):
    session_id: str
    insight_ids: Optional[list[str]] = None


class PracticePlanResponse(BaseModel):
    markdown: str
