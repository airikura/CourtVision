from fastapi import APIRouter, HTTPException
from models.schemas import PracticePlanRequest, PracticePlanResponse, Insight
from routers.analysis import _completed

router = APIRouter()


@router.post("/practice-plan", response_model=PracticePlanResponse)
async def generate_practice_plan(body: PracticePlanRequest):
    insights: list[Insight] = _completed.get(body.session_id, [])

    if not insights:
        raise HTTPException(
            status_code=404,
            detail="No completed analysis found for this session",
        )

    # Filter to requested insight IDs if provided
    if body.insight_ids:
        id_set = set(body.insight_ids)
        insights = [i for i in insights if i.id in id_set]

    # Group by stroke type
    groups: dict[str, list[Insight]] = {}
    for insight in insights:
        key = insight.stroke_type.value
        groups.setdefault(key, []).append(insight)

    # Build Markdown practice plan
    lines = ["# Practice Plan\n"]
    for stroke, items in sorted(groups.items()):
        lines.append(f"## {stroke}\n")
        for item in items:
            severity_label = f"[{item.issue_severity.value}]"
            lines.append(f"- {severity_label} {item.correction_text}")
        lines.append("")

    markdown = "\n".join(lines)
    return PracticePlanResponse(markdown=markdown)
