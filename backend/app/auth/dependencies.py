import time
from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RoleEnum, User
from app.services import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ============================================================
# User lookup cache (judgment calls #1-4 above)
# ============================================================

_USER_CACHE_TTL_SECONDS = 30


@dataclass(frozen=True)
class CachedUser:
    """Plain snapshot of the fields callers actually need from User —
    never the ORM instance itself. Caching the live SQLAlchemy object
    caused DetachedInstanceError once its originating request's session
    closed (session is request-scoped via get_db(); the cache is not).
    Add fields here as routers start needing them (e.g. .name is already
    included since some routes read current_user.name)."""
    id: int
    email: str
    name: str
    role: RoleEnum


_user_cache: dict[int, tuple[CachedUser, float]] = {}


def _get_cached_user(db: Session, user_id: int) -> "CachedUser | None":
    now = time.monotonic()
    cached = _user_cache.get(user_id)
    if cached is not None:
        cached_user, expires_at = cached
        if now < expires_at:
            return cached_user
        del _user_cache[user_id]

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None

    snapshot = CachedUser(id=user.id, email=user.email, name=user.name, role=user.role)
    _user_cache[user_id] = (snapshot, now + _USER_CACHE_TTL_SECONDS)
    return snapshot


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> CachedUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = auth_service.decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise credentials_exception

    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise credentials_exception

    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise credentials_exception

    user = _get_cached_user(db, user_id)
    if user is None:
        raise credentials_exception

    return user


def require_role(*allowed_roles: RoleEnum) -> Callable[[CachedUser], CachedUser]:
    def _check_role(current_user: CachedUser = Depends(get_current_user)) -> CachedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{current_user.role.value}' is not permitted to "
                    f"access this resource"
                ),
            )
        return current_user

    return _check_role