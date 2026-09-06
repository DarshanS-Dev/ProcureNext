"""
app/routers/evaluator.py

Layer 4, Stage 2 — Evaluator Assignment + COI HTTP routes (Doc B Stage 2, Doc D "Evaluators").

Endpoints:
    GET    /problem-statements/{id}/evaluators                     (any authenticated)
    POST   /problem-statements/{id}/evaluators                     (admin)
    POST   /problem-statements/{id}/evaluators/replace              (admin)
    POST   /applications/{id}/coi-declaration                       (evaluator-own)
    GET    /applications/{id}/coi-declaration                       (officer/admin/evaluator-assigned)

Routers own HTTP concerns + DI only (Depends(get_db), Depends(require_role)) —
all business logic and DB access lives in evaluator_service.py. Assignment
verification (Q4: is this evaluator assigned to this PS?) is done in
evaluator_service, not re-checked in router (consistent with scoring.py's
pattern of delegating verification to service).

Judgment calls flagged inline:

1. GET /problem-statements/{id}/evaluators — "any authenticated" per Doc D.
   Returns PSEvaluatorAssignmentRead rows in flat list (Q5 locked: no per-
   application recusal join). Recusal status is per-application, visible via
   separate GET /applications/{id}/coi-declaration endpoint.

2. POST /{id}/evaluators — admin only, creates PSEvaluatorAssignment. Allows
   zero evaluators pre-publish (Doc B Stage 2 #1). Blocks duplicate via service-
   layer check + unique constraint (Q1 locked).

3. POST /{id}/evaluators/replace — admin only, recusal path. Takes old and new
   evaluator IDs + the application being recused on. Service validates all
   exist and old is assigned; inserts new, creates/marks recused COI row for
   old evaluator.

4. POST /applications/{id}/coi-declaration — evaluator-own (role-gated to
   RoleEnum.evaluator only). Input: declared_conflict bool. Service auto-sets
   recused=True if conflict declared, checks Q4 assignment gate.

5. GET /applications/{id}/coi-declaration — officer/admin/evaluator-assigned,
   returns the COI declaration for this application and the calling evaluator
   (if they're evaluator-assigned). For officer/admin, returns it regardless
   of evaluator assignment.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.database import get_db
from app.models import Application, ProblemStatement, RoleEnum, User
from app.schemas.core_schemas import (
    COIDeclarationCreate,
    COIDeclarationRead,
    PSEvaluatorAssignmentCreate,
    PSEvaluatorAssignmentRead,
    PSEvaluatorAssignmentReplaceRequest,
)
from app.services import evaluator_service

router = APIRouter(tags=["Evaluators"])


def _get_ps_or_404(db: Session, ps_id: int) -> ProblemStatement:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == ps_id).first()
    if ps is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem statement not found")
    return ps


def _get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


@router.get("/problem-statements/{ps_id}/evaluators", response_model=list[PSEvaluatorAssignmentRead])
def get_ps_evaluators(
    ps_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /problem-statements/{id}/evaluators — any authenticated. Flat list of
    PSEvaluatorAssignment rows (Q5 locked: no per-application recusal join — recusal
    is per-application, visible via separate GET /applications/{id}/coi-declaration)."""
    _get_ps_or_404(db, ps_id)
    return evaluator_service.get_ps_evaluators(db, ps_id)


@router.post("/problem-statements/{ps_id}/evaluators", response_model=PSEvaluatorAssignmentRead, status_code=status.HTTP_201_CREATED)
def assign_evaluator(
    ps_id: int,
    payload: PSEvaluatorAssignmentCreate,
    current_user: User = Depends(require_role(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """POST /problem-statements/{id}/evaluators — admin only. Initial assignment
    of evaluator to PS. Allows zero evaluators pre-publish (Doc B Stage 2 #1).
    Blocks duplicate via unique constraint (Q1 locked)."""
    _get_ps_or_404(db, ps_id)

    try:
        return evaluator_service.assign_evaluator(
            db,
            problem_statement_id=ps_id,
            evaluator_id=payload.evaluator_id,
            assigned_by=current_user.id,
        )
    except evaluator_service.UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except evaluator_service.DuplicateAssignmentError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post("/problem-statements/{ps_id}/evaluators/replace", response_model=PSEvaluatorAssignmentRead)
def replace_evaluator(
    ps_id: int,
    payload: PSEvaluatorAssignmentReplaceRequest,
    current_user: User = Depends(require_role(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """POST /problem-statements/{id}/evaluators/replace — admin only. Recusal path:
    old evaluator is marked recused on one application, new evaluator is assigned to
    the PS (Q2 locked: old row untouched, both now assigned to PS). Service creates/marks
    COI row for old evaluator with recused=True."""
    _get_ps_or_404(db, ps_id)

    try:
        return evaluator_service.replace_evaluator(
            db,
            problem_statement_id=ps_id,
            new_evaluator_id=payload.new_evaluator_id,
            old_evaluator_id=payload.old_evaluator_id,
            recused_application_id=payload.recused_application_id,
            replaced_by=current_user.id,
        )
    except evaluator_service.UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except evaluator_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except evaluator_service.EvaluatorServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except evaluator_service.DuplicateAssignmentError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post("/applications/{application_id}/coi-declaration", response_model=COIDeclarationRead, status_code=status.HTTP_201_CREATED)
def declare_coi(
    application_id: int,
    payload: COIDeclarationCreate,
    current_user: User = Depends(require_role(RoleEnum.evaluator)),
    db: Session = Depends(get_db),
):
    """POST /applications/{id}/coi-declaration — evaluator-own. Mandatory before
    scoring (Doc B Stage 2 #4). If declared_conflict=True, auto-sets recused=True.
    Insert-only, no resubmission allowed (Q3 locked, unique constraint). Q4 gate
    (evaluator must be assigned to this app's PS) enforced in service."""
    _get_application_or_404(db, application_id)

    try:
        return evaluator_service.declare_coi(
            db,
            application_id=application_id,
            evaluator_id=current_user.id,
            declared_conflict=payload.declared_conflict,
        )
    except evaluator_service.EvaluatorNotAssignedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except evaluator_service.DuplicateCOIDeclarationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except evaluator_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except evaluator_service.UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/applications/{application_id}/coi-declaration", response_model=COIDeclarationRead)
def get_coi_declaration(
    application_id: int,
    current_user: User = Depends(
        require_role(RoleEnum.officer, RoleEnum.admin, RoleEnum.evaluator)
    ),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/coi-declaration — officer/admin/evaluator-assigned.
    Returns the COI declaration for this application + current user (evaluator).
    For officer/admin, returns regardless of role; for evaluator, returns their own
    declaration."""
    application = _get_application_or_404(db, application_id)

    # For evaluator: can only view their own COI declaration
    if current_user.role == RoleEnum.evaluator:
        coi = evaluator_service.get_coi_declaration(
            db, application_id=application_id, evaluator_id=current_user.id
        )
        if coi is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="COI declaration not found")
        return coi

    # For officer/admin: verify ownership (officer must own this app's PS)
    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    # For admin: unrestricted. But this endpoint doesn't take an evaluator_id,
    # so we can't return "the" COI declaration for a specific evaluator from
    # just the application_id. Judgment call: return None (404) or list all COI
    # declarations for this application? Doc D doesn't specify the shape for admin.
    # Choosing to 404 for now since there's no evaluator_id in the path, and adding
    # one would be a schema change. If admin needs to see all declarations for an
    # application, that's a separate endpoint (not modeled yet).
    coi = evaluator_service.get_coi_declaration(
        db, application_id=application_id, evaluator_id=current_user.id
    )
    if coi is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="COI declaration not found")
    return coi