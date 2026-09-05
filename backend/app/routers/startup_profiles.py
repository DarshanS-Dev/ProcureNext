"""
app/routers/startup_profiles.py

Layer 1 — StartupProfile HTTP routes (Doc B Layer 1, Doc D "Auth & Users").

Endpoints:
    GET    /startup/profile                          (startup, self)
    PATCH  /startup/profile/level1                    (startup, self)
    PATCH  /startup/profile/level2                    (startup, self)
    GET    /startup/profile/{user_id}                (officer/evaluator/independent_evaluator/admin)
    POST   /admin/startups/{user_id}/verify-compliance (admin)
    GET    /admin/startups?compliance_status=unverified (admin)

Separate file from routers/auth.py despite Doc D grouping both under the
same "Auth & Users" heading — StartupProfile has enough of its own
distinct endpoints (6) and a dedicated service module
(startup_profile_service.py) to warrant its own router file rather than
bloating auth.py.  Both get included under the same tag for docs purposes.

Ownership notes (see app/auth/dependencies.py's judgment call #1 —
require_role is role-only, not ownership-aware):

- GET /startup/profile: "self" is enforced by using current_user.id
  directly as the lookup key — there is no {user_id} path param to spoof.
- PATCH level1/level2: same — current_user.id is the only id ever used,
  a startup can never target another user's profile via this endpoint.
- GET /startup/profile/{user_id}: role-gated only (any of the four listed
  roles may view ANY startup's profile) — Doc D doesn't scope this to
  "officers who have a relationship with this startup," it's a flat
  role check. No additional ownership filter applied, matching Doc D's
  own endpoint annotation literally.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.models import RoleEnum, User
from app.schemas.core_schemas import (
    ComplianceVerificationRequest,
    StartupProfileLevel1Update,
    StartupProfileLevel2Update,
    StartupProfileMergedRead,
    StartupProfileRead,
)
from app.services import startup_profile_service

router = APIRouter(tags=["Auth & Users"])


# ============================================================
# Startup, self
# ============================================================

@router.get("/startup/profile", response_model=StartupProfileRead)
def get_my_profile(
    current_user: User = Depends(require_role(RoleEnum.startup)),
    db: Session = Depends(get_db),
):
    """GET /startup/profile — startup, self. Raw StartupProfile shape."""
    try:
        return startup_profile_service.get_own_profile(db, current_user.id)
    except startup_profile_service.ProfileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/startup/profile/level1", response_model=StartupProfileRead)
def patch_profile_level1(
    payload: StartupProfileLevel1Update,
    current_user: User = Depends(require_role(RoleEnum.startup)),
    db: Session = Depends(get_db),
):
    """PATCH /startup/profile/level1 — startup, self. Partial-overwrite."""
    try:
        return startup_profile_service.update_level1(
            db, current_user.id, payload.model_dump(exclude_unset=True)
        )
    except startup_profile_service.ProfileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/startup/profile/level2", response_model=StartupProfileRead)
def patch_profile_level2(
    payload: StartupProfileLevel2Update,
    current_user: User = Depends(require_role(RoleEnum.startup)),
    db: Session = Depends(get_db),
):
    """PATCH /startup/profile/level2 — startup, self. Partial-overwrite."""
    try:
        return startup_profile_service.update_level2(
            db, current_user.id, payload.model_dump(exclude_unset=True)
        )
    except startup_profile_service.ProfileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ============================================================
# Officer / Evaluator / Independent Evaluator / Admin — view any startup
# ============================================================

@router.get("/startup/profile/{user_id}", response_model=StartupProfileMergedRead)
def get_startup_profile_by_id(
    user_id: int,
    current_user: User = Depends(
        require_role(
            RoleEnum.officer,
            RoleEnum.evaluator,
            RoleEnum.independent_evaluator,
            RoleEnum.admin,
        )
    ),
    db: Session = Depends(get_db),
):
    """GET /startup/profile/{user_id} — merged User+StartupProfile view,
    role-gated only (see module docstring's ownership note)."""
    try:
        return startup_profile_service.get_profile_merged(db, user_id)
    except startup_profile_service.ProfileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ============================================================
# Admin — compliance verification + unverified filter
# ============================================================

@router.post(
    "/admin/startups/{user_id}/verify-compliance",
    response_model=StartupProfileRead,
)
def verify_startup_compliance(
    user_id: int,
    payload: ComplianceVerificationRequest,
    current_user: User = Depends(require_role(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """POST /admin/startups/{user_id}/verify-compliance — admin only.
    Single pass, all four fields submitted together (§5.1)."""
    try:
        return startup_profile_service.verify_compliance(
            db,
            user_id=user_id,
            admin_id=current_user.id,
            dpiit_status=payload.dpiit_status,
            entity_verified=payload.entity_verified,
            pan_verified=payload.pan_verified,
            gst_verified=payload.gst_verified,
        )
    except startup_profile_service.ProfileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/admin/startups", response_model=list[StartupProfileRead])
def list_startups(
    compliance_status: Optional[str] = Query(default=None),
    current_user: User = Depends(require_role(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """
    GET /admin/startups?compliance_status=unverified — admin only.

    Only the literal `compliance_status=unverified` filter is modeled,
    matching Doc D's exact querystring. Any other/missing value currently
    falls through to "no filter" (returns nothing via this handler's
    narrow branch) — JUDGMENT CALL: rather than silently return an
    unfiltered full list for an unrecognized query value (which could
    look like the filter "worked" when it didn't), an unrecognized value
    raises 422 so the caller notices immediately.
    """
    if compliance_status is None or compliance_status == "unverified":
        return startup_profile_service.list_unverified_startups(db)
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Unsupported compliance_status filter: {compliance_status!r}",
    )