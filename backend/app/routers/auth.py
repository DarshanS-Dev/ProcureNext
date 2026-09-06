"""
app/routers/auth.py

Layer 1 — Auth & Users HTTP routes (Doc B Layer 1, Doc D "Auth & Users").

Endpoints:
    POST /auth/register        (public, startup only)
    POST /auth/login           (public)
    POST /admin/users          (admin)
    GET  /admin/users          (admin)

Routers own HTTP concerns + DI only (Depends(get_db), Depends(require_role)) —
all business logic and DB access lives in auth_service.py. No ownership
checks needed on this file's endpoints (registration/login have no owning
row yet; admin routes are role-gated only, per Doc B Layer 1 #1 — Admin's
"create non-self-service accounts" carve-out has no additional per-request
ownership dimension).

Judgment call flagged inline:

1. `register_startup` / `create_user_by_admin` / `authenticate_user` raise
   plain `ValueError` on business-rule failures (duplicate email, bad
   credentials). This router translates those into HTTP responses — a
   thin try/except per endpoint, since auth_service.py doesn't raise
   dedicated exception subclasses the way the later services do (e.g.
   application_service's ApplicationServiceError hierarchy). Not fixing
   auth_service.py's exception style retroactively here — out of scope
   for a router-only pass; noting it in case it's worth a consistency
   pass later.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.models import RoleEnum, User
from app.schemas.core_schemas import LoginRequest, TokenResponse, UserCreate, UserRead
from app.services import auth_service

router = APIRouter(tags=["Auth & Users"])


# ============================================================
# Public — Registration & Login
# ============================================================

@router.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Public, startup-only self-service signup (Doc B Layer 1 #1). Any
    `role` value submitted in the body is ignored — auth_service forces
    role=startup regardless.
    """
    try:
        user = auth_service.register_startup(
            db, email=payload.email, password=payload.password, name=payload.name
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return user


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Public. Returns a 24h JWT access token, no refresh token (Doc B Layer 1 #6)."""
    try:
        access_token = auth_service.login(db, email=payload.email, password=payload.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(access_token=access_token)


# ============================================================
# Admin — non-self-service account creation (PRD §03 carve-out a)
# ============================================================

@router.post("/admin/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    payload: UserCreate,
    current_user: User = Depends(require_role(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """
    Admin-only creation of non-self-service accounts (officer, evaluator,
    independent_evaluator, admin). `role` is required here (unlike
    /auth/register where it's ignored) — rejecting role=startup explicitly
    since startups must self-register (Doc B Layer 1 #1).
    """
    if payload.role is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="role is required when an admin creates a user",
        )
    try:
        user = auth_service.create_user_by_admin(
            db,
            email=payload.email,
            password=payload.password,
            name=payload.name,
            role=payload.role,
            created_by_admin_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return user


@router.get("/admin/users", response_model=list[UserRead])
def list_users(
    current_user: User = Depends(require_role(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """Admin-only listing of all User accounts."""
    return db.query(User).all()