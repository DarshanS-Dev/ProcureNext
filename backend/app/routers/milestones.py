"""
app/routers/milestones.py
Stage C — PilotMilestone + Evidence endpoints.

Role access per Doc D:
  GET milestones:       startup-own / officer / independent_evaluator / admin
  PATCH milestone:      officer-owner only
  POST evidence:        startup-own only
  PATCH review:         independent_evaluator only

ASSUMPTION: get_current_user returns object with .id and .role.
Mount in main.py: app.include_router(milestones.router)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.schemas.execution_schemas import (
    PilotMilestoneRead,
    PilotMilestoneUpdate,
    EvidenceCreate,
    EvidenceRead,
    MilestoneReviewUpdate,
)
from app.services import milestone_service

router = APIRouter(tags=["milestones"])

_ALLOWED_GET_ROLES = {"officer", "independent_evaluator", "admin", "startup"}


@router.get("/contracts/{contract_id}/milestones", response_model=List[PilotMilestoneRead])
def get_milestones(
    contract_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in _ALLOWED_GET_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return milestone_service.get_milestones(db=db, contract_id=contract_id)


@router.patch("/contracts/{contract_id}/milestones/{milestone_id}", response_model=PilotMilestoneRead)
def update_milestone(
    contract_id: int,
    milestone_id: int,
    payload: PilotMilestoneUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Officer-owner only. milestone_type/count/order are not in the payload schema
    # so they cannot be touched regardless of what the client sends (Doc C #1, #3).
    if user.role != "officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an officer can update milestone targets or display name",
        )
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
    user=Depends(get_current_user),
):
    if user.role != "startup":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a startup can submit evidence",
        )
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
    user=Depends(get_current_user),
):
    if user.role != "independent_evaluator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an independent evaluator can review milestone evidence",
        )
    return milestone_service.review_milestone(
        db=db,
        contract_id=contract_id,
        milestone_id=milestone_id,
        review_status=payload.status,
        payment_status=payload.payment_status,
    )