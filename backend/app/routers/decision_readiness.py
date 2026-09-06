"""
app/routers/decision_readiness.py

Layer 4, Stage 6 — Decision Readiness HTTP route (Doc B Stage 6, Doc D
"Decision Readiness").

Endpoints:
    GET    /applications/{id}/decision-readiness    (officer-owner/admin)

Note: `POST /applications/{id}/select` (the other half of Stage 6, per Doc D's
own comment "selection itself uses POST /applications/{id}/select, listed
above under Applications") lives in routers/applications.py, not here — it's
Layer 3's table (SelectionDecision) even though the gate it enforces is
Stage 6's. Keeping this router to exactly the one read-only endpoint Doc D
scopes to Stage 6 itself.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.models import Application, ProblemStatement, RoleEnum, User
from app.schemas.core_schemas import DecisionReadinessRead
from app.services import decision_readiness_service

router = APIRouter(tags=["Decision Readiness"])


def _get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


@router.get("/applications/{application_id}/decision-readiness", response_model=DecisionReadinessRead)
def get_decision_readiness(
    application_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/decision-readiness — officer-owner/admin.
    Computed live on every call, never cached (Doc B Stage 6 #1)."""
    application = _get_application_or_404(db, application_id)
    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    try:
        return decision_readiness_service.get_decision_readiness(db, application_id)
    except decision_readiness_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))