"""
app/routers/sandbox_trial.py
Stage A — Sandbox Trial endpoints.

Role access per Doc D:
  POST/PATCH: independent_evaluator only
  GET:        officer / independent_evaluator / admin / startup
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models import RoleEnum
from app.schemas.execution_schemas import (
    SandboxTrialCreate,
    SandboxTrialUpdate,
    SandboxTrialRead,
)
from app.services import sandbox_service

router = APIRouter(prefix="/applications/{application_id}/sandbox-trial", tags=["sandbox-trial"])


@router.post("", response_model=SandboxTrialRead, status_code=201)
def create_sandbox_trial(
    application_id: int,
    payload: SandboxTrialCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.independent_evaluator)),
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
    user=Depends(require_role(RoleEnum.independent_evaluator)),
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
    user=Depends(require_role(RoleEnum.officer, RoleEnum.independent_evaluator, RoleEnum.admin, RoleEnum.startup)),
):
    return sandbox_service.get_sandbox_trial(db=db, application_id=application_id)