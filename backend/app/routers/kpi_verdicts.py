"""
app/routers/kpi_verdicts.py
Stage D — KPIVerdict endpoints.

Role access per Doc D:
  POST /contracts/{id}/kpi-verdicts:  independent_evaluator
  GET  /contracts/{id}/kpi-verdicts:  officer / independent_evaluator / admin / startup
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models import RoleEnum
from app.schemas.execution_schemas import (
    KPIVerdictCreate,
    KPIVerdictRead,
)
from app.services import kpi_service

router = APIRouter(tags=["kpi-verdicts"])


@router.post(
    "/contracts/{contract_id}/kpi-verdicts",
    response_model=KPIVerdictRead,
    status_code=201,
)
def create_kpi_verdict(
    contract_id: int,
    payload: KPIVerdictCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.independent_evaluator)),
):
    return kpi_service.create_kpi_verdict(
        db=db,
        contract_id=contract_id,
        kpi_id=payload.kpi_id,
        verdict=payload.verdict,
        verification_mode=payload.verification_mode,
        verified_by=user.id,
        justification=payload.justification,
    )


@router.get(
    "/contracts/{contract_id}/kpi-verdicts",
    response_model=List[KPIVerdictRead],
)
def get_kpi_verdicts(
    contract_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.officer, RoleEnum.independent_evaluator, RoleEnum.admin, RoleEnum.startup)),
):
    return kpi_service.get_kpi_verdicts(db=db, contract_id=contract_id)