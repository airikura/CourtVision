# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CourtVision — a tennis footage analysis platform. Users upload tennis videos, which are compressed in-browser, stored in GCS/S3, analyzed by Google Gemini (multimodal), and results streamed back as annotated insights on a timeline.

## Commands

### Frontend (`/frontend`)

```bash
npm run dev      # Development server (port 3000, Turbopack)
npm run build    # Production build
npm run lint     # ESLint check
```

### Backend (`/backend`)

```bash
uvicorn main:app --reload --port 8000   # Development server
pip install -r requirements.txt          # Install dependencies
```

### Environment Setup

- Frontend: copy `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Backend: copy `.env.example` → `.env` and fill in `GEMINI_API_KEY`, GCS/S3 credentials, `FRONTEND_URL`

## Architecture

### Data Flow

1. User drops video → FFmpeg.wasm compresses it in-browser (`lib/ffmpegCompress.ts`)
2. `POST /upload/init` → session ID created, presigned URL returned
3. Video uploaded directly to GCS/S3 via presigned URL (`lib/s3Upload.ts`)
4. `POST /upload/confirm` → backend marks session ready
5. `GET /analysis/{sessionId}/stream` → SSE stream; Gemini processes video, backend streams `Insight` objects
6. Frontend renders insights on timeline; user can export a practice plan via `POST /export/practice-plan`

### State Management

Zustand stores (`store/`):
- `uploadSlice` — upload phase and progress
- `playerSlice` — video playback state
- `insightsSlice` — streamed insights, active filter, stream status

### Backend Structure

- `routers/` — FastAPI route handlers (`upload.py`, `analysis.py`, `export.py`)
- `services/` — `gemini_service.py` (Gemini 1.5 Pro), `gcs_service.py`, `s3_service.py`, `analysis_parser.py`
- `models/schemas.py` — shared Pydantic models (`Insight`, upload/confirm request/response)
- Session state is held in-memory (not persistent across restarts)

### Key Types

Defined in `frontend/types/`:
- `StrokeType`: `"Serve" | "Forehand" | "Backhand" | "Volley" | "Footwork" | "Tactical"`
- `IssueSeverity`: `"High" | "Medium" | "Low"`
- `UploadPhase`: `"idle" | "compressing" | "uploading" | "processing" | "done" | "error"`
- `Insight`: `{ id, timestamp_start, timestamp_end, stroke_type, issue_severity, analysis_text, correction_text }`

## Important Notes

### Next.js Version Warning

> This is NOT the Next.js you know — v16 with Turbopack has breaking changes. Read `node_modules/next/dist/docs/` before writing frontend code. Heed deprecation notices.

The `next.config.ts` sets `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required for FFmpeg.wasm's `SharedArrayBuffer` support.

### No Tests

There are currently no test files, Jest config, or pytest config in this repo.
