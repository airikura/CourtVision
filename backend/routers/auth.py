from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from core.config import settings
from core.security import hash_password, verify_password, create_access_token
from database import get_db
from models.db_models import User

router = APIRouter()


# ── Request / Response schemas ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str

    model_config = {"from_attributes": True}


# Rebuild AuthResponse so UserOut is resolved
AuthResponse.model_rebuild()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _token_response(user: User) -> AuthResponse:
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_response(user)


@router.post("/google", response_model=AuthResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        id_info = google_id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    google_sub: str = id_info["sub"]
    email: str = id_info.get("email", "")
    name: str = id_info.get("name", email.split("@")[0])

    # Find by google_sub first, then by email
    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()

    if user is None:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.google_sub = google_sub
        else:
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                display_name=name,
                google_sub=google_sub,
            )
            db.add(user)

    await db.commit()
    await db.refresh(user)
    return _token_response(user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
