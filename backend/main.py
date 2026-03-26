from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import upload, analysis, export, auth, library

app = FastAPI(title="CourtVision API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(upload.router, prefix="/upload", tags=["upload"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(library.router, prefix="/library", tags=["library"])



@app.get("/health")
async def health():
    return {"status": "ok"}
