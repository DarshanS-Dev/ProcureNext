"""
app/routers/risk_containment.py

Layer 4, Stage 5 — Risk Profile + Containment Plan HTTP routes (Doc B Stage 5,
Doc D "Risk Profile + Containment Plan").

Endpoints:
    GET    /applications/{id}/risk-profile                    (officer/admin; system-computed, no POST)
    POST   /applications/{id}/containment-plan/ai-assist         (officer-owner; advisory only, no write)
    POST   /applications/{id}/containment-plan                    (officer-owner; final human-submitted values)
    GET    /applications/{id}/containment-plan                     (officer-owner/admin)

Routers own HTTP concerns + DI only — all formulas/lookup tables and DB access
live in risk_containment_service.py. No POST /risk-profile route exists at all
(Doc B Stage 5 #1/#2 — both preliminary and final rows are auto-computed by
system triggers wired into application_service.py and qcbs_service.py
respectively; there is no manual/officer-initiated write path for RiskProfile).

Judgment calls flagged inline:

1. GET /risk-profile is officer/admin only per Doc D (no startup-own, no
   evaluator — unlike most other read endpoints in this codebase). Matches
   PRD §08 ("Evaluators do not see risk scores during technical scoring") and
   the general "risk defensibility" framing being an officer/admin tool, not
   something surfaced to the applicant.

2. containment-plan/ai-assist takes an empty body (ContainmentPlanAiAssistRequest
   has no fields, per core_schemas.py) — the officer just calls it against an
   application_id already known from the path, service derives everything from
   existing PS/StartupProfile data. Never writes, matches
   problem_statement_service.ai_assist's "advisory only" contract exactly.

3. POST /containment-plan is upsert (risk_containment_service judgment call #5)
   — this router does not distinguish "create" vs "update" at the HTTP level,
   both use POST per Doc D's own endpoint list (no separate PATCH route exists
   for this resource). Returns 200 either way rather than 201, since a second
   POST against the same application is a legitimate update, not a resource
   creation collision.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.models import Application, ProblemStatement, RoleEnum, User
from app.schemas.core_schemas import (
    ContainmentPlanAiAssistRequest,
    ContainmentPlanAiAssistResponse,
    ContainmentPlanCreate,
    ContainmentPlanRead,
    RiskProfileRead,
)
from app.services import risk_containment_service

router = APIRouter(tags=["Risk Profile + Containment Plan"])


def _get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


def _assert_officer_owns_or_admin(db: Session, current_user: User, application: Application) -> None:
    if current_user.role == RoleEnum.admin:
        return
    if current_user.role == RoleEnum.officer and _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")


# ============================================================
# Risk Profile — read only, no write route (judgment call in module docstring)
# ============================================================

@router.get("/applications/{application_id}/risk-profile", response_model=list[RiskProfileRead])
def get_risk_profile(
    application_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/risk-profile — officer/admin; returns both
    preliminary and/or final rows if they exist (system-computed, no POST)."""
    application = _get_application_or_404(db, application_id)
    _assert_officer_owns_or_admin(db, current_user, application)
    return risk_containment_service.get_risk_profiles_for_application(db, application_id)


# ============================================================
# Containment Plan — AI-assist (advisory only)
# ============================================================

@router.post(
    "/applications/{application_id}/containment-plan/ai-assist",
    response_model=ContainmentPlanAiAssistResponse,
)
def containment_plan_ai_assist(
    application_id: int,
    payload: ContainmentPlanAiAssistRequest,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /applications/{id}/containment-plan/ai-assist — officer-owner,
    advisory only, no write. Drafts from already-structured PS/profile fields
    via fixed templates (see risk_containment_service judgment call #6)."""
    application = _get_application_or_404(db, application_id)
    if not _is_officer_of_ps(db, current_user.id, application.problem_statement_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    try:
        return risk_containment_service.containment_plan_ai_assist(db, application_id)
    except risk_containment_service.StartupProfileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except risk_containment_service.ProblemStatementNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ============================================================
# Containment Plan — final submit + read
# ============================================================

@router.post("/applications/{application_id}/containment-plan", response_model=ContainmentPlanRead)
def create_or_update_containment_plan(
    application_id: int,
    payload: ContainmentPlanCreate,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /applications/{id}/containment-plan — officer-owner; final human-
    submitted values. Requires a final RiskProfile to already exist (Doc B
    Stage 5 #7). Upsert semantics — see judgment call #3."""
    application = _get_application_or_404(db, application_id)
    if not _is_officer_of_ps(db, current_user.id, application.problem_statement_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    try:
        return risk_containment_service.create_or_update_containment_plan(
            db,
            application_id=application_id,
            officer_id=current_user.id,
            data=payload.model_dump(exclude_unset=True),
        )
    except risk_containment_service.FinalRiskProfileMissingError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/applications/{application_id}/containment-plan", response_model=ContainmentPlanRead)
def get_containment_plan(
    application_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/containment-plan — officer-owner/admin."""
    application = _get_application_or_404(db, application_id)
    _assert_officer_owns_or_admin(db, current_user, application)

    plan = risk_containment_service.get_containment_plan(db, application_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Containment plan not found")
    return plan