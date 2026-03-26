from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from database import get_db
from models.db_models import InsightRow, User, Video
from models.schemas import PracticePlanRequest, PracticePlanResponse, Insight
import asyncio
from services.gemini_service import generate_match_cues, generate_drills

router = APIRouter()


@router.post("/practice-plan", response_model=PracticePlanResponse)
async def generate_practice_plan(
    body: PracticePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    result = await db.execute(
        select(Video).where(Video.id == body.session_id, Video.user_id == current_user.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch insights from DB
    stmt = select(InsightRow).where(InsightRow.video_id == body.session_id)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    if not rows:
        raise HTTPException(status_code=404, detail="No completed analysis found for this session")

    # Build Insight objects
    insights = [_row_to_insight(r) for r in rows]

    if body.insight_ids:
        id_set = set(body.insight_ids)
        insights = [i for i in insights if i.id in id_set]

    # Group by stroke type
    groups: dict[str, list[Insight]] = {}
    for insight in insights:
        key = insight.stroke_type.value
        groups.setdefault(key, []).append(insight)

    lines = ["# Practice Plan\n"]
    for stroke, items in sorted(groups.items()):
        lines.append(f"## {stroke}\n")
        for item in items:
            severity_label = f"[{item.issue_severity.value}]"
            lines.append(f"- {severity_label} {item.correction_text}")
        lines.append("")

    correction_groups = {
        stroke: [i.correction_text for i in items]
        for stroke, items in groups.items()
    }
    cues_markdown, drills_markdown = await asyncio.gather(
        generate_match_cues(correction_groups),
        generate_drills(correction_groups),
    )

    return PracticePlanResponse(
        markdown="\n".join(lines),
        cues_markdown=cues_markdown,
        drills_markdown=drills_markdown,
    )


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
