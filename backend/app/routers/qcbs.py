"""
app/routers/qcbs.py

Layer 4, Stage 4 — QCBS HTTP routes (Doc B Stage 4, Doc D "QCBS").

Endpoints:
    GET    /applications/{id}/qcbs-score                (officer-owner/admin)
    GET    /problem-statements/{id}/qcbs-ranking          (officer-owner/admin)

Query-time only — no write endpoints exist on this router (no QCBS table;
qcbs_service.py's only write is the internal commercial-envelope auto-unlock,
which has no HTTP route of its own per Doc D).

Judgment call flagged inline:

1. Both endpoints are officer-owner/admin only, matching Doc D and Doc B
   Stage 4 #2 exactly ("evaluators do not see aggregated scores or QCBS
   ranking after the fact"). Ownership enforced in-router since
   qcbs_service.py raises only QCBSServiceError subclasses, no
   PermissionError.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.models import Application, ProblemStatement, RoleEnum, User
from app.schemas.core_schemas import QCBSRankingRead, QCBSScoreRead
from app.services import qcbs_service

router = APIRouter(tags=["QCBS"])


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


@router.get("/applications/{application_id}/qcbs-score", response_model=QCBSScoreRead)
def get_qcbs_score(
    application_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/qcbs-score — officer-owner/admin."""
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    try:
        return qcbs_service.get_qcbs_score(db, application_id)
    except qcbs_service.MissingBidError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except qcbs_service.ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/problem-statements/{ps_id}/qcbs-ranking", response_model=QCBSRankingRead)
def get_qcbs_ranking(
    ps_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /problem-statements/{id}/qcbs-ranking — officer-owner/admin."""
    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(db, current_user.id, ps_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    try:
        return qcbs_service.get_qcbs_ranking(db, ps_id)
    except qcbs_service.ProblemStatementNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except qcbs_service.NoRankableApplicationsError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except qcbs_service.MissingBidError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))