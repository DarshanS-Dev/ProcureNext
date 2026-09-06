# ============================================================
# app/routers/pilot_outcome.py
# Layer 5, Stage E — PilotOutcome
#
# ASSUMPTIONS (adjust to match your real codebase):
# - app.database.get_db is your DB session dependency
# - app.auth.get_current_user returns an object with .id and .role
# - Router is mounted in main.py, e.g.:
#     app.include_router(pilot_outcome.router)
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.models import Application, Contract, ProblemStatement
from app.schemas.execution_schemas import PilotOutcomeCreate, PilotOutcomeRead
from app.services import pilot_outcome_service

router = APIRouter(prefix="/contracts/{contract_id}/pilot-outcome", tags=["pilot-outcome"])

_ALLOWED_GET_ROLES = {"officer", "independent_evaluator", "admin", "startup"}


def require_officer_owner(contract_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Doc D: POST is officer-owner only. "Owner" = the officer who created the
    ProblemStatement this contract's application belongs to — same ownership
    chain used for /select, /containment-plan, etc. in Layer 4.
    """
    if user.role != "officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an officer can record a pilot outcome",
        )

    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )
    application = db.query(Application).filter(
        Application.id == contract.application_id
    ).first()
    ps = db.query(ProblemStatement).filter(
        ProblemStatement.id == application.problem_statement_id
    ).first()
    if ps is None or ps.officer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own the problem statement behind this contract",
        )
    return user


@router.post("", response_model=PilotOutcomeRead, status_code=201)
def create_pilot_outcome(
    contract_id: int,
    payload: PilotOutcomeCreate,
    db: Session = Depends(get_db),
    user=Depends(require_officer_owner),
):
    return pilot_outcome_service.create_pilot_outcome(
        db=db,
        contract_id=contract_id,
        overall_result=payload.overall_result,
        rationale=payload.rationale,
        decided_by=user.id,
    )


@router.get("", response_model=PilotOutcomeRead)
def get_pilot_outcome(
    contract_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in _ALLOWED_GET_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return pilot_outcome_service.get_pilot_outcome(
        db=db,
        contract_id=contract_id,
        requesting_user=user,
    )