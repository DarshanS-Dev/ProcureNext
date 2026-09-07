"""
app/routers/milestones.py
Stage C — PilotMilestone + Evidence endpoints.

Role access per Doc D:
  GET milestones:   officer / independent_evaluator / admin / startup
  PATCH milestone:  officer only
  POST evidence:    startup only
  PATCH review:     independent_evaluator only
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models import RoleEnum
from app.schemas.execution_schemas import (
    PilotMilestoneRead,
    PilotMilestoneUpdate,
    EvidenceCreate,
    EvidenceRead,
    MilestoneReviewUpdate,
)
from app.services import milestone_service

router = APIRouter(tags=["milestones"])


@router.get("/contracts/{contract_id}/milestones", response_model=List[PilotMilestoneRead])
def get_milestones(
    contract_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.officer, RoleEnum.independent_evaluator, RoleEnum.admin, RoleEnum.startup)),
):
    return milestone_service.get_milestones(db=db, contract_id=contract_id)


@router.patch("/contracts/{contract_id}/milestones/{milestone_id}", response_model=PilotMilestoneRead)
def update_milestone(
    contract_id: int,
    milestone_id: int,
    payload: PilotMilestoneUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.officer)),
):
    return milestone_service.update_milestone(
        db=db,
        contract_id=contract_id,
        milestone_id=milestone_id,
        officer_id=user.id,
        due_date=payload.due_date,
        target_value=payload.target_value,
        target_unit=payload.target_unit,
        display_name=payload.display_name,
    )


@router.post(
    "/contracts/{contract_id}/milestones/{milestone_id}/evidence",
    response_model=EvidenceRead,
    status_code=201,
)
def submit_evidence(
    contract_id: int,
    milestone_id: int,
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.startup)),
):
    return milestone_service.submit_evidence(
        db=db,
        contract_id=contract_id,
        milestone_id=milestone_id,
        file_reference=payload.file_reference,
    )


@router.patch(
    "/contracts/{contract_id}/milestones/{milestone_id}/review",
    response_model=PilotMilestoneRead,
)
def review_milestone(
    contract_id: int,
    milestone_id: int,
    payload: MilestoneReviewUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.independent_evaluator)),
):
    return milestone_service.review_milestone(
        db=db,
        contract_id=contract_id,
        milestone_id=milestone_id,
        review_status=payload.status,
        payment_status=payload.payment_status,
    )