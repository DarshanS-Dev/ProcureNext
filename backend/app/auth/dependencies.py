"""
app/auth/dependencies.py

FastAPI dependency-injection layer for auth. Pure request-plumbing — no
business logic lives here (that's auth_service.py's job). Every router
depends on this module via Depends(get_current_user) / Depends(require_role(...)).

Judgment call flagged inline:

1. `require_role` only checks ROLE membership (e.g. "is this an officer?").
   It does NOT check OWNERSHIP (e.g. "is this the officer who owns THIS
   specific ProblemStatement?"). Doc D's endpoint table uses labels like
   "officer-owner" and "startup-own" throughout — those ownership
   comparisons are NOT handled here. They're either done explicitly inside
   the router (comparing current_user.id against the row's officer_id/
   startup_id before calling the service) or already enforced inside the
   service layer itself (e.g. problem_statement_service.update_problem_statement
   already raises PermissionError if officer_id doesn't match). Routers
   using an "-owner"/"-own" endpoint must not assume require_role() alone
   is sufficient.
"""

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


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decodes the Bearer token, loads the corresponding User row.
    Raises 401 on: missing/malformed token, expired token, invalid
    signature, or a token whose subject no longer maps to a real User
    (e.g. account deleted after the token was issued — no such deletion
    path exists yet, but defended against regardless).
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

    user = db.query(User).filter(User.id == user_id).first()
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