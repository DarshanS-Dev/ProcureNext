"""
app/routers/kpi_verdicts.py
Layer 5, Stage D — KPIVerdict endpoints.

SCOPE NOTE:
POST/GET /problem-statements/{id}/kpis are NOT here. KPI creation is a
Layer 2 gap-fix (Doc C Stage D #1, Doc D "Problem Statements" section) and
belongs to Darshan. Layer 5 consumes those KPI rows, it does not create them.

Role access per Doc D:
  POST /contracts/{id}/kpi-verdicts:    independent_evaluator
  GET  /contracts/{id}/kpi-verdicts:    officer/independent_evaluator/admin/startup-own

ASSUMPTION: get_current_user returns object with .id and .role.
Mount in main.py: app.include_router(kpi_verdicts.router)
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.execution_schemas import (
    KPIVerdictCreate,
    KPIVerdictRead,
)
from app.services import kpi_service

router = APIRouter(tags=["kpi-verdicts"])

_ALLOWED_VERDICT_GET_ROLES = {"officer", "independent_evaluator", "admin", "startup"}


def require_independent_evaluator(user=Depends(get_current_user)):
    if user.role != "independent_evaluator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an independent evaluator can submit KPI verdicts",
        )
    return user


@router.post(
    "/contracts/{contract_id}/kpi-verdicts",
    response_model=KPIVerdictRead,
    status_code=201,
)
def create_kpi_verdict(
    contract_id: int,
    payload: KPIVerdictCreate,
    db: Session = Depends(get_db),
    user=Depends(require_independent_evaluator),
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
    user=Depends(get_current_user),
):
    if user.role not in _ALLOWED_VERDICT_GET_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    # `requesting_user` lets the service enforce the startup-OWN half of the
    # rule — without it any startup could read any contract's verdicts.
    return kpi_service.get_kpi_verdicts(
        db=db,
        contract_id=contract_id,
        requesting_user=user,
    )