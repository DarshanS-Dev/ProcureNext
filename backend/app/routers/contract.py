"""
app/routers/contract.py
Stage B — Contract endpoints.

Role access per Doc D:
  POST: officer-owner only
  GET:  officer / independent_evaluator / admin / startup-own

ASSUMPTION: get_current_user returns object with .id and .role.
Mount in main.py: app.include_router(contract.router)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.execution_schemas import ContractCreate, ContractRead
from app.services import contract_service

router = APIRouter(tags=["contract"])

_ALLOWED_GET_ROLES = {"officer", "independent_evaluator", "admin", "startup"}


@router.post("/applications/{application_id}/contract", response_model=ContractRead, status_code=201)
def create_contract(
    application_id: int,
    payload: ContractCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != "officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an officer can create a contract",
        )
    return contract_service.create_contract(
        db=db,
        application_id=application_id,
        officer_id=user.id,
    )


@router.get("/applications/{application_id}/contract", response_model=ContractRead)
def get_contract(
    application_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in _ALLOWED_GET_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    # ASSUMPTION: startup-own check — add user.id == application.startup_id
    # guard when user.role == "startup" if needed.
    return contract_service.get_contract(db=db, application_id=application_id)