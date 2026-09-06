"""
app/routers/scoring.py

Layer 4, Stage 3 — Technical Scoring HTTP routes (Doc B Stage 3, Doc D "Technical Scoring").

Endpoints:
    GET    /rubric-criteria                          (any authenticated)
    POST   /applications/{id}/scores                   (evaluator-assigned, non-recused)
    GET    /applications/{id}/scores                     (officer/admin/evaluator-assigned)
    GET    /applications/{id}/scores/completeness          (officer/admin)

Judgment calls flagged inline:

1. "evaluator-assigned" ownership on POST/GET .../scores is NOT enforced
   by a PSEvaluatorAssignment lookup here — Stage 2 (evaluator_service.py)
   is explicitly skipped/unbrainstormed project-wide. Enforcing role-only
   (require_role(evaluator)) for POST, and role-only
   (officer/admin/evaluator) for GET, matching the same gap already
   flagged in applications.py judgment call #2. scoring_service.submit_scores
   itself still enforces the real gate that matters (COI declaration must
   exist and recused=False) — so a non-assigned evaluator would still be
   blocked there UNLESS they happen to have filed a COIDeclaration, which
   requires an application_id (not currently gated on PSEvaluatorAssignment
   either, for the same Stage-2-pending reason). Flagging clearly rather
   than silently pretending this is airtight: full assignment-based
   authorization is a follow-up once evaluator_service.py lands.

2. GET .../scores officer/admin ownership: officer must own the
   application's PS (checked in-router); evaluator role is allowed through
   at the role level only per judgment call #1 above (no per-evaluator
   filtering of which rows they can see — Doc D doesn't scope evaluator
   visibility to "only their own scores" on this read endpoint).

3. GET /rubric-criteria has no ownership dimension at all (Doc D: any
   authenticated) — plain get_current_user, no extra checks.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.database import get_db
from app.models import Application, ProblemStatement, RoleEnum, User
from app.schemas.core_schemas import (
    EvaluationScoreCreate,
    EvaluationScoreRead,
    RubricCriterionRead,
    ScoreCompletenessRead,
)
from app.services import scoring_service

router = APIRouter(tags=["Technical Scoring"])


def _get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


@router.get("/rubric-criteria", response_model=list[RubricCriterionRead])
def get_rubric_criteria(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /rubric-criteria — any authenticated; returns the 7 seeded rows."""
    return scoring_service.get_rubric_criteria(db)


@router.post("/applications/{application_id}/scores", response_model=list[EvaluationScoreRead], status_code=status.HTTP_201_CREATED)
def submit_scores(
    application_id: int,
    payload: EvaluationScoreCreate,
    current_user: User = Depends(require_role(RoleEnum.evaluator)),
    db: Session = Depends(get_db),
):
    """POST /applications/{id}/scores — evaluator-assigned, non-recused.
    Q4 gate (evaluator_service.py integration) now enforced: evaluator must be
    assigned to the application's PS (403 if not)."""
    _get_application_or_404(db, application_id)

    try:
        return scoring_service.submit_scores(
            db,
            application_id=application_id,
            evaluator_id=current_user.id,
            scores=[entry.model_dump() for entry in payload.scores],
        )
    except scoring_service.EvaluatorNotAssignedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except scoring_service.COIGateBlockedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except scoring_service.UnknownCriterionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except scoring_service.DuplicateScoreError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except scoring_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

@router.get("/applications/{application_id}/scores", response_model=list[EvaluationScoreRead])
def get_scores(
    application_id: int,
    current_user: User = Depends(
        require_role(RoleEnum.officer, RoleEnum.admin, RoleEnum.evaluator)
    ),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/scores — officer/admin/evaluator-assigned
    (evaluator allowed at role level only — see judgment call #1/#2)."""
    application = _get_application_or_404(db, application_id)
    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")
    return scoring_service.get_scores_for_application(db, application_id)


@router.get("/applications/{application_id}/scores/completeness", response_model=ScoreCompletenessRead)
def get_scores_completeness(
    application_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/scores/completeness — officer/admin."""
    application = _get_application_or_404(db, application_id)
    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    try:
        return scoring_service.get_scoring_completeness(db, application_id)
    except scoring_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))