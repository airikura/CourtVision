import json
import asyncio
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, RedirectResponse, Response

from models.schemas import AnalysisResultsResponse
from services import gemini_service, gcs_service
from routers.upload import get_session

router = APIRouter()

# Cache completed analyses (replace with persistent store in production)
_completed: dict[str, list] = {}


@router.get("/{session_id}/stream")
async def stream_analysis(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("status") != "ready":
        raise HTTPException(status_code=400, detail="Session not ready for analysis")

    async def event_generator():
        insights = []
        try:
            async for insight in gemini_service.stream_analysis(session_id):
                insights.append(insight)
                yield f"data: {insight.model_dump_json()}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            return

        _completed[session_id] = insights
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
async def get_video(session_id: str, request: Request):
    """
    Stream video from GCS with range request support.
    No session lookup — the file path is deterministic from session_id.
    """
    try:
        data = await asyncio.to_thread(gcs_service.download_blob, session_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found")

    total = len(data)
    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=start-end"
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
async def get_results(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session_id in _completed:
        return AnalysisResultsResponse(
            insights=_completed[session_id],
            status="done",
        )

    status = session.get("status", "streaming")
    return AnalysisResultsResponse(insights=[], status=status)
