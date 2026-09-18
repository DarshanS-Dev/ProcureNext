"""
app/auth/dependencies.py

FastAPI dependency-injection layer for auth. Pure request-plumbing — no
business logic lives here (that's auth_service.py's job). Every router
depends on this module via Depends(get_current_user) / Depends(require_role(...)).

PERFORMANCE PASS (this session, per BACKEND_PERFORMANCE.md P1-2):
get_current_user previously queried the `users` table by id on every single
request — including every request in a fanned-out page load (20-60x for the
same user within a few seconds, per P0-1's bulk-endpoint discussion). Added
a short-TTL in-memory cache keyed by user_id in front of that query.

Chose caching over "trust the token and skip the DB entirely" (the doc's
Option B) — the JWT already carries sub+role and could be trusted for
read-only routes, but that means a revoked/deactivated/role-changed user
stays valid for the rest of the token's 24h life. No user-deactivation path
exists yet, but this will matter once one does. A short TTL keeps almost
all of the benefit (the fan-out pattern is many requests within seconds)
without that security tradeoff.

Judgment calls flagged inline:

1. TTL = 30s. Long enough to absorb an entire fanned-out page load (P0-1
   endpoints reduce this a lot already, but P1-2 still helps every other
   endpoint plus whatever fan-out remains). Short enough that a role change
   via /admin/users or any future deactivation surfaces within 30s, not 24h.

2. Cache is a plain in-process dict with (value, expiry) tuples — NOT Redis
   or any shared store. This means with `--workers 4` (P0-4), each worker
   process has its own cache, and a user might see a stale row in one
   worker and a fresh one in another for up to 30s. Acceptable for this
   TTL window; flagged in case a shared cache is wanted later once the
   app is horizontally scaled beyond a single machine (at which point an
   in-process cache alone won't even keep workers on the same box in sync
   either — a real distributed cache would be the fix then, not this one).

3. Cache is invalidated implicitly by TTL expiry only — no explicit
   invalidation hook on user mutation (e.g. role change via admin, future
   deactivation). Doc B/PRD doesn't have a user-update endpoint yet besides
   creation, so there's nothing to hook into today. Flagged: if
   PATCH /admin/users/{id} is ever added, that's the function to add an
   explicit cache.pop(user_id) call to, rather than waiting out the TTL.

4. No cache size cap / eviction policy beyond TTL-on-read (expired entries
   are dropped lazily when checked, not proactively swept). For this
   platform's expected user count (startups + a handful of officers/
   evaluators/admins), unbounded-until-TTL-checked is a non-issue. Flagging
   in case this ever needs to become an LRU with a max size.
"""

import time
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RoleEnum, User
from app.services import auth_service

# tokenUrl points at the login endpoint purely for OpenAPI docs/Swagger's
# "Authorize" button — this app issues tokens via JSON body, not OAuth2
# form-encoded password flow, but OAuth2PasswordBearer is still the
# correct/standard way to extract a Bearer token from the Authorization
# header in FastAPI regardless of how the token was originally obtained.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ============================================================
# User lookup cache (judgment calls #1-4 above)
# ============================================================

_USER_CACHE_TTL_SECONDS = 30
_user_cache: dict[int, tuple[User, float]] = {}


def _get_cached_user(db: Session, user_id: int) -> "User | None":
    """Returns the cached User row if present and not expired, else queries
    the DB and repopulates the cache. Expired entries are dropped lazily
    (judgment call #4) rather than swept proactively."""
    now = time.monotonic()
    cached = _user_cache.get(user_id)
    if cached is not None:
        user, expires_at = cached
        if now < expires_at:
            return user
        del _user_cache[user_id]

    user = db.query(User).filter(User.id == user_id).first()
    if user is not None:
        _user_cache[user_id] = (user, now + _USER_CACHE_TTL_SECONDS)
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decodes the Bearer token, loads the corresponding User row (via the
    short-TTL cache above — see module docstring). Raises 401 on:
    missing/malformed token, expired token, invalid signature, or a token
    whose subject no longer maps to a real User (e.g. account deleted
    after the token was issued — no such deletion path exists yet, but
    defended against regardless).
    """
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


def require_role(*allowed_roles: RoleEnum) -> Callable[[User], User]:
    """
    Dependency factory. Usage:
        Depends(require_role(RoleEnum.officer, RoleEnum.admin))

    Checks ROLE MEMBERSHIP ONLY — see judgment call #1 above regarding
    ownership checks, which are NOT this function's responsibility.
    """

    def _check_role(current_user: User = Depends(get_current_user)) -> User:
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