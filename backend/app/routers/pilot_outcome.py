"""
app/routers/pilot_outcome.py
Layer 5, Stage E — PilotOutcome

Role access per Doc D:
  POST: officer-owner of the PS behind the contract
  GET:  officer / independent_evaluator / admin / startup
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models import RoleEnum, Application, Contract, ProblemStatement
from app.schemas.execution_schemas import PilotOutcomeCreate, PilotOutcomeRead
from app.services import pilot_outcome_service

router = APIRouter(prefix="/contracts/{contract_id}/pilot-outcome", tags=["pilot-outcome"])


def require_officer_owner(
    contract_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.officer)),
):
    """
    Officer-owner = the officer who created the ProblemStatement this
    contract's application belongs to.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    application = db.query(Application).filter(Application.id == contract.application_id).first()
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == application.problem_statement_id).first()

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
    user=Depends(require_role(RoleEnum.officer, RoleEnum.independent_evaluator, RoleEnum.admin, RoleEnum.startup)),
):
    return pilot_outcome_service.get_pilot_outcome(
        db=db,
        contract_id=contract_id,
        requesting_user=user,
    )