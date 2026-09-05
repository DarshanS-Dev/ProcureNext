"""
Service layer — Auth (Layer 1). Owner: Darshan.

Scope: JWT issuance/validation, password hashing, login/register business logic.
Full implementation.

# ASSUMPTION: app.config.settings exposes JWT_SECRET (str) and JWT_ALGORITHM (str,
# default "HS256"). If your actual config.py names these differently, rename the
# two references below — everything else is self-contained.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models import RoleEnum, StartupProfile, User
from app.services import audit_log_service

ACCESS_TOKEN_EXPIRE_SECONDS = 24 * 60 * 60  # 24h, no refresh token (Doc B Layer 1 #6)


# ============================================================
# Password hashing
# ============================================================
# Using the `bcrypt` library directly instead of passlib — passlib is unmaintained
# (no bcrypt 4.x support without pinning bcrypt<4.0.0) and unnecessary here since
# we only need hash + verify, not passlib's multi-scheme abstraction.

def hash_password(plain_password: str) -> str:
    """Hash a plaintext password (bcrypt) for storage in User.password_hash."""
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against the stored hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


# ============================================================
# JWT issuance/validation
# ============================================================

def create_access_token(user_id: int, role: RoleEnum) -> str:
    """Issue a JWT access token. 24h expiry, no refresh token (Doc B Layer 1 #6).
    Payload carries sub=user_id, role, exp, iat."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role.value if isinstance(role, RoleEnum) else role,
        "iat": now,
        "exp": now + timedelta(seconds=ACCESS_TOKEN_EXPIRE_SECONDS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode + validate a JWT access token. Raises jwt.ExpiredSignatureError or
    jwt.InvalidTokenError on failure — used by app/auth/dependencies.py's
    require_role() DI, which should catch these and raise HTTP 401."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


# ============================================================
# Registration / Login business logic
# ============================================================

def register_startup(db: Session, email: str, password: str, name: str) -> User:
    """POST /auth/register — public, startup-only self-service signup (Doc B Layer 1 #1).
    Forces role=startup regardless of any role value submitted. Creates the User row
    and an empty StartupProfile row (Level 1/2 fields null until PATCHed)."""
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise ValueError("Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        role=RoleEnum.startup,
    )
    db.add(user)
    db.flush()  # populate user.id before creating the dependent profile row

    profile = StartupProfile(user_id=user.id)
    db.add(profile)

    # GAP FIX: this call was missing when auth_service.py was first written
    # (audit_log_service.py didn't exist yet). Added now to match the
    # project-wide "every mutating service function logs to AuditLog"
    # convention. actor_id=user.id since self-registration has no other
    # actor to attribute it to.
    audit_log_service.write_audit_log(
        db,
        actor_id=user.id,
        action="user_registered",
        entity_type="User",
        entity_id=user.id,
    )

    db.commit()
    db.refresh(user)
    return user


def create_user_by_admin(
    db: Session, email: str, password: str, name: str, role: RoleEnum, created_by_admin_id: int
) -> User:
    """POST /admin/users — admin-only creation for non-startup roles (officer, evaluator,
    independent_evaluator, admin). No public route for these roles (Doc B Layer 1 #1).

    created_by_admin_id is accepted for AuditLog purposes (caller logs
    action=user_created_by_admin) — not stored on User itself, no such column exists.
    """
    if role == RoleEnum.startup:
        raise ValueError("Startup accounts must use self-service registration, not this endpoint")

    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise ValueError("Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        role=role,
    )
    db.add(user)
    db.flush()  # populate user.id before logging

    # GAP FIX: see register_startup's identical note above. actor_id is the
    # admin who created this account (Doc B Layer 1 #1 / PRD §03 carve-out a).
    audit_log_service.write_audit_log(
        db,
        actor_id=created_by_admin_id,
        action="user_created_by_admin",
        entity_type="User",
        entity_id=user.id,
        metadata={"role": role.value},
    )

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """POST /auth/login — looks up User by email, verifies password. Returns None
    (caller raises 401) if lookup or password check fails."""
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def login(db: Session, email: str, password: str) -> str:
    """Full login flow: authenticate_user() then create_access_token(). Returns the
    JWT string for TokenResponse. Raises ValueError on failed authentication —
    caller (router) translates this to HTTP 401."""
    user = authenticate_user(db, email, password)
    if user is None:
        raise ValueError("Invalid email or password")
    return create_access_token(user_id=user.id, role=user.role)