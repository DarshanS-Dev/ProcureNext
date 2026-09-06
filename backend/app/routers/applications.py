"""
app/routers/applications.py

Layer 3 — Application HTTP routes (Doc B Layer 3, Doc D "Applications").

Endpoints:
    POST   /applications                                (startup; gated on Level 2 + compliance_verified_at)
    GET    /applications/{id}                            (startup-own / officer-of-PS / evaluator-assigned / admin)
    GET    /applications?problem_statement_id=            (officer-owner / admin)
    GET    /applications?startup_id=                       (startup-own / admin)
    PATCH  /applications/{id}/eligibility-check             (officer; sets sector_eligible/certification_check)
    GET    /applications/{id}/eligibility-check              (officer/evaluator/admin/startup-own)
    POST   /applications/{id}/select                          (officer-owner; enforces Decision Readiness gate)

Note: `POST /applications/{id}/eligibility-check` (Doc D: "system-triggered on
submit") is NOT exposed as a separate route here — application_service.create_application
already creates the EligibilityCheck row synchronously inside the same transaction
as Application creation (Doc B Layer 3 transition table: applied -> under_review
happens automatically). There is no scenario where a client calls this separately;
exposing it as an HTTP route would invite a caller to try to trigger it twice
against the unique application_id constraint. Doc D lists it for completeness/
documentation of the state machine, not as a route frontend ever calls.

Routers own HTTP concerns + DI only — all business logic lives in
application_service.py. Ownership enforcement patterns mirror checklist.py /
scoring.py exactly (in-router helpers, not re-derived in the service).

Judgment calls flagged inline:

1. "evaluator-assigned" on GET /applications/{id} is allowed at role-level only
   (require_role includes RoleEnum.evaluator), same known gap already flagged
   in scoring.py judgment call #1 — full per-evaluator-assignment filtering is
   pending evaluator_service.py's PSEvaluatorAssignment lookup being wired
   everywhere consistently. Not re-solved here, same gap carried forward.

2. GET /applications?problem_statement_id=&startup_id= — Doc D lists these as
   two separate query-filtered listings with different ownership scopes
   (officer-owner/admin vs. startup-own/admin). Modeled as ONE endpoint with
   two optional query params rather than two routes sharing a path, since
   FastAPI can't have two GET /applications handlers on the same path. Router
   dispatches ownership checks based on which filter was actually supplied;
   requires exactly one of the two filters (both or neither is a 400) to avoid
   an ambiguous "which ownership rule applies" case.

3. PATCH /applications/{id}/eligibility-check officer ownership: officer must
   own the application's PS — checked in-router (mirrors checklist.py's
   `_is_officer_of_ps` pattern) before delegating to
   application_service.update_eligibility_check.

4. POST /applications/{id}/select error translation: application_service raises
   its own ApplicationNotSelectableError/NotOfficerOfProblemStatementError/
   DuplicateSelectionError (400/403/409 respectively), and separately
   decision_readiness_service.NotDecisionReadyError propagates up uncaught by
   application_service — caught here directly and translated to 400 with the
   full per-check readiness dict in the response body, so the officer sees
   exactly which of the six checks failed rather than a bare message.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.database import get_db
from app.models import Application, ProblemStatement, RoleEnum, User
from app.schemas.core_schemas import (
    ApplicationCreate,
    ApplicationRead,
    EligibilityCheckRead,
    EligibilityCheckReviewUpdate,
    SelectionDecisionRead,
)
from app.services import application_service, decision_readiness_service

router = APIRouter(tags=["Applications"])


def _get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


def _assert_can_view_application(db: Session, current_user: User, application: Application) -> None:
    """Shared ownership gate for GET /applications/{id} and GET .../eligibility-check
    (both: startup-own/officer-of-PS/evaluator-assigned/admin per Doc D)."""
    if current_user.role == RoleEnum.admin:
        return
    if current_user.role == RoleEnum.startup and application.startup_id == current_user.id:
        return
    if current_user.role == RoleEnum.officer and _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        return
    if current_user.role == RoleEnum.evaluator:
        # judgment call #1: role-level only, same known gap as scoring.py
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view this application")


# ============================================================
# Create
# ============================================================

@router.post("/applications", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(require_role(RoleEnum.startup)),
    db: Session = Depends(get_db),
):
    """POST /applications — startup; gated on PS published + Level 2 complete +
    compliance_verified_at (application_service enforces all three)."""
    try:
        return application_service.create_application(
            db,
            startup_id=current_user.id,
            problem_statement_id=payload.problem_statement_id,
            technical_proposal=payload.technical_proposal,
            commercial_proposal=payload.commercial_proposal,
        )
    except application_service.ProblemStatementNotOpenError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except application_service.IncompleteProfileError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except application_service.ComplianceNotVerifiedError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except application_service.DuplicateApplicationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except application_service.ApplicationServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ============================================================
# Reads
# ============================================================

@router.get("/applications/{application_id}", response_model=ApplicationRead)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /applications/{id} — startup-own/officer-of-PS/evaluator-assigned/admin."""
    application = _get_application_or_404(db, application_id)
    _assert_can_view_application(db, current_user, application)
    return application


@router.get("/applications", response_model=list[ApplicationRead])
def list_applications(
    problem_statement_id: Optional[int] = Query(default=None),
    startup_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /applications?problem_statement_id= (officer-owner/admin) OR
    GET /applications?startup_id= (startup-own/admin) — see judgment call #2.
    Exactly one filter must be supplied.
    """
    if (problem_statement_id is None) == (startup_id is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide exactly one of problem_statement_id or startup_id",
        )

    if problem_statement_id is not None:
        if current_user.role == RoleEnum.officer and not _is_officer_of_ps(
            db, current_user.id, problem_statement_id
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")
        if current_user.role not in (RoleEnum.officer, RoleEnum.admin):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted")
        return application_service.list_applications_by_problem_statement(db, problem_statement_id)

    # startup_id branch
    if current_user.role == RoleEnum.startup and startup_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your applications")
    if current_user.role not in (RoleEnum.startup, RoleEnum.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted")
    return application_service.list_applications_by_startup(db, startup_id)


# ============================================================
# EligibilityCheck
# ============================================================

@router.get("/applications/{application_id}/eligibility-check", response_model=EligibilityCheckRead)
def get_eligibility_check(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/eligibility-check — officer/evaluator/admin/startup-own."""
    application = _get_application_or_404(db, application_id)
    _assert_can_view_application(db, current_user, application)
    try:
        return application_service.get_eligibility_check(db, application_id)
    except application_service.EligibilityCheckNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/applications/{application_id}/eligibility-check", response_model=EligibilityCheckRead)
def update_eligibility_check(
    application_id: int,
    payload: EligibilityCheckReviewUpdate,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """PATCH /applications/{id}/eligibility-check — officer; sets
    sector_eligible/certification_check; reviewed_by/reviewed_at server-side."""
    application = _get_application_or_404(db, application_id)
    if not _is_officer_of_ps(db, current_user.id, application.problem_statement_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    try:
        return application_service.update_eligibility_check(
            db,
            application_id=application_id,
            sector_eligible=payload.sector_eligible,
            certification_check=payload.certification_check,
            reviewed_by=current_user.id,
        )
    except application_service.EligibilityCheckNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except application_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ============================================================
# Selection (Doc B Stage 6 #2-4)
# ============================================================

@router.post("/applications/{application_id}/select", response_model=SelectionDecisionRead, status_code=status.HTTP_201_CREATED)
def select_application(
    application_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /applications/{id}/select — officer-owner; enforces Decision
    Readiness gate server-side, rejects with 400 (readiness detail attached)
    if any of the six checks fail (Doc B Stage 6 #2)."""
    try:
        return application_service.create_selection_decision(
            db, application_id=application_id, officer_id=current_user.id
        )
    except application_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except application_service.NotOfficerOfProblemStatementError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except application_service.ApplicationNotSelectableError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except application_service.DuplicateSelectionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except decision_readiness_service.NotDecisionReadyError as exc:
        # judgment call #4: expose the full per-check readiness dict, not just
        # a generic message, so the officer sees exactly what's blocking them.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Decision Readiness gate failed", "readiness": exc.readiness},
        )