"""
app/routers/contract.py
Stage B — Contract endpoints.

Role access per Doc D:
  POST: officer only
  GET:  officer / independent_evaluator / admin / startup
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models import RoleEnum
from app.schemas.execution_schemas import ContractCreate, ContractRead
from app.services import contract_service

router = APIRouter(tags=["contract"])


@router.post("/applications/{application_id}/contract", response_model=ContractRead, status_code=201)
def create_contract(
    application_id: int,
    payload: ContractCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.officer)),
):
    return contract_service.create_contract(
        db=db,
        application_id=application_id,
        officer_id=user.id,
    )


@router.get("/applications/{application_id}/contract", response_model=ContractRead)
def get_contract(
    application_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.officer, RoleEnum.independent_evaluator, RoleEnum.admin, RoleEnum.startup)),
):
    return contract_service.get_contract(db=db, application_id=application_id)