# ============================================================
# app/routers/sandbox_router.py
#
# ASSUMPTIONS (adjust to match your real codebase):
# - app.database.get_db is your DB session dependency
# - app.auth (or wherever) has get_current_user, returning an object
#   with .role, and role values match the User.role enum
#   (officer, startup, evaluator, independent_evaluator, admin)
# - Router is mounted in main.py, e.g.:
#     app.include_router(sandbox_router.router)
# ============================================================

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user  # ADJUST to your actual auth dependency
from app.schemas.execution_schemas import (
    SandboxTrialCreate,
    SandboxTrialUpdate,
    SandboxTrialRead,
)
from app.services import sandbox_service

router = APIRouter(prefix="/applications/{application_id}/sandbox-trial", tags=["sandbox-trial"])


def require_independent_evaluator(user=Depends(get_current_user)):
    if user.role != "independent_evaluator":
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an independent evaluator can perform this action",
        )
    return user


@router.post("", response_model=SandboxTrialRead, status_code=201)
def create_sandbox_trial(
    application_id: int,
    payload: SandboxTrialCreate,
    db: Session = Depends(get_db),
    user=Depends(require_independent_evaluator),
):
    return sandbox_service.create_sandbox_trial(
        db=db,
        application_id=application_id,
        functional_check=payload.functional_check,
        directional_kpi_check=payload.directional_kpi_check,
        operational_fit_check=payload.operational_fit_check,
        no_red_flags_check=payload.no_red_flags_check,
        verification_mode=payload.verification_mode,
        verified_by=user.id,
        notes=payload.notes,
    )


@router.patch("/{trial_id}", response_model=SandboxTrialRead)
def update_sandbox_trial(
    application_id: int,
    trial_id: int,
    payload: SandboxTrialUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_independent_evaluator),
):
    return sandbox_service.update_sandbox_trial(
        db=db,
        application_id=application_id,
        trial_id=trial_id,
        verdict_override=payload.verdict,
        notes=payload.notes,
    )


@router.get("", response_model=SandboxTrialRead)
def get_sandbox_trial(
    application_id: int,
    db: Session = Depends(get_db),
    # ASSUMPTION: allowed roles per Doc D — officer/independent_evaluator/admin/startup-own.
    # "startup-own" ownership check isn't implemented here — add a check that
    # user.id == application.startup_id when user.role == "startup".
    user=Depends(get_current_user),
):
    return sandbox_service.get_sandbox_trial(db=db, application_id=application_id)