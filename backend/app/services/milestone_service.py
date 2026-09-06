"""
app/services/milestone_service.py
Stage C — PilotMilestone + Evidence logic.

Doc C Stage C decisions followed:
- #1: 5 rows auto-created at contract creation (done in contract_service.py).
- #2: Officer sets due_date/target_value/target_unit via PATCH.
- #3: Officer sets display_name (cosmetic only) via same PATCH.
       milestone_type is NEVER modified here.
- #4: Startup submits evidence → Evidence row created, milestone status → submitted.
- #5: Independent evaluator reviews → status accepted/rejected.
- #6: payment_status updated alongside review.
- #7: Rejected milestone → startup re-submits new Evidence (no formal re-submission
       workflow; same milestone row, status returns to submitted).
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status
from typing import List

from app.models import (
    Contract,
    PilotMilestone,
    Evidence,
    MilestoneStatusEnum,
    PaymentStatusEnum,
    EvidenceSourceEnum,
)


# ---- GET /contracts/{id}/milestones ----
def get_milestones(db: Session, contract_id: int) -> List[PilotMilestone]:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if contract is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )
    return (
        db.query(PilotMilestone)
        .filter(PilotMilestone.contract_id == contract_id)
        .all()
    )


# ---- PATCH /contracts/{id}/milestones/{milestone_id} ----
# Officer sets due_date, target_value, target_unit, display_name.
# milestone_type, count, and order are NEVER touched here (Doc C #1, #3).
def update_milestone(
    db: Session,
    contract_id: int,
    milestone_id: int,
    officer_id: int,
    due_date=None,
    target_value=None,
    target_unit=None,
    display_name=None,
) -> PilotMilestone:
    milestone = db.query(PilotMilestone).filter(
        PilotMilestone.id == milestone_id,
        PilotMilestone.contract_id == contract_id,
    ).first()
    if milestone is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Milestone not found",
        )

    if due_date is not None:
        milestone.due_date = due_date
    if target_value is not None:
        milestone.target_value = target_value
    if target_unit is not None:
        milestone.target_unit = target_unit
    if display_name is not None:
        # Cosmetic only — milestone_type stays unchanged (Doc C #3).
        milestone.display_name = display_name

    db.commit()
    db.refresh(milestone)
    return milestone


# ---- POST /contracts/{id}/milestones/{milestone_id}/evidence ----
# Startup submits evidence. source_tag forced to startup_submitted.
# Milestone status flips to submitted (Doc C #4).
def submit_evidence(
    db: Session,
    contract_id: int,
    milestone_id: int,
    file_reference: str,
) -> Evidence:
    milestone = db.query(PilotMilestone).filter(
        PilotMilestone.id == milestone_id,
        PilotMilestone.contract_id == contract_id,
    ).first()
    if milestone is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Milestone not found",
        )

    evidence = Evidence(
        milestone_id=milestone_id,
        source_tag=EvidenceSourceEnum.startup_submitted,
        file_reference=file_reference,
    )
    db.add(evidence)

    # Flip milestone status → submitted (Doc C #4).
    milestone.status = MilestoneStatusEnum.submitted

    db.commit()
    db.refresh(evidence)
    return evidence


# ---- PATCH /contracts/{id}/milestones/{milestone_id}/review ----
# Independent evaluator reviews submitted evidence.
# Sets status (accepted/rejected) and payment_status (Doc C #5, #6).
def review_milestone(
    db: Session,
    contract_id: int,
    milestone_id: int,
    review_status: MilestoneStatusEnum,
    payment_status: PaymentStatusEnum,
) -> PilotMilestone:
    milestone = db.query(PilotMilestone).filter(
        PilotMilestone.id == milestone_id,
        PilotMilestone.contract_id == contract_id,
    ).first()
    if milestone is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Milestone not found",
        )

    if milestone.status != MilestoneStatusEnum.submitted:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Milestone must be in 'submitted' status to review, got '{milestone.status}'",
        )

    milestone.status = review_status
    milestone.payment_status = payment_status

    db.commit()
    db.refresh(milestone)
    return milestone