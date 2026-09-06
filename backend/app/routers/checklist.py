"""
app/routers/checklist.py

Layer 4, Stage 1 — Checklist HTTP routes (Doc B Stage 1, Doc D "Checklist").

Endpoints:
    GET    /applications/{id}/checklist                  (startup-own/officer/admin)
    PATCH  /applications/{id}/checklist/{item_id}          (startup-own; upload)
    PATCH  /applications/{id}/checklist/{item_id}/review    (officer/admin; verify/reject)

Judgment calls flagged inline:

1. Ownership (startup-own on the parent Application, officer-of-PS on the
   parent Application's ProblemStatement) is enforced in-router, same
   pattern as applications.py — checklist_service.py explicitly does not
   re-derive ownership itself (see its own docstring judgment call #3).

2. GET /checklist allows startup-own/officer-of-PS/admin, matching Doc D
   exactly (no evaluator-assigned listed here, unlike applications.py's
   endpoints — so no Stage-2-pending gap on this route).

3. PATCH .../review's `decision` is accepted via ChecklistItemReviewUpdate
   (status: ChecklistStatusEnum) and passed straight to
   review_checklist_item(), which itself validates it's verified/rejected
   only — router does not duplicate that check, just relays
   InvalidReviewDecisionError as 400.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.database import get_db
from app.models import Application, ChecklistItem, ProblemStatement, RoleEnum, User
from app.schemas.core_schemas import (
    ChecklistItemRead,
    ChecklistItemReviewUpdate,
    ChecklistItemUploadUpdate,
)
from app.services import checklist_service

router = APIRouter(tags=["Checklist"])


def _get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


def _assert_can_view(db: Session, current_user: User, application: Application) -> None:
    if current_user.role == RoleEnum.admin:
        return
    if current_user.role == RoleEnum.startup and application.startup_id == current_user.id:
        return
    if current_user.role == RoleEnum.officer and _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to view this checklist")


def _get_item_or_404(db: Session, item_id: int) -> ChecklistItem:
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found")
    return item


@router.get("/applications/{application_id}/checklist", response_model=list[ChecklistItemRead])
def get_checklist(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /applications/{id}/checklist — startup-own/officer/admin."""
    application = _get_application_or_404(db, application_id)
    _assert_can_view(db, current_user, application)
    return checklist_service.get_checklist_for_application(db, application_id)


@router.patch("/applications/{application_id}/checklist/{item_id}", response_model=ChecklistItemRead)
def upload_checklist_item(
    application_id: int,
    item_id: int,
    payload: ChecklistItemUploadUpdate,
    current_user: User = Depends(require_role(RoleEnum.startup)),
    db: Session = Depends(get_db),
):
    """PATCH /applications/{id}/checklist/{item_id} — startup-own; upload ->
    status=uploaded. Valid from pending or rejected (checklist_service judgment call #2)."""
    application = _get_application_or_404(db, application_id)
    if application.startup_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your application")

    item = _get_item_or_404(db, item_id)
    if item.application_id != application_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found on this application")

    try:
        return checklist_service.upload_checklist_item(
            db, item_id=item_id, uploaded_by=current_user.id, file_reference=payload.file_reference
        )
    except checklist_service.InvalidChecklistTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/applications/{application_id}/checklist/{item_id}/review", response_model=ChecklistItemRead)
def review_checklist_item(
    application_id: int,
    item_id: int,
    payload: ChecklistItemReviewUpdate,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """PATCH /applications/{id}/checklist/{item_id}/review — officer/admin;
    verify/reject. Officer must own the application's PS; admin unrestricted."""
    application = _get_application_or_404(db, application_id)
    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(
        db, current_user.id, application.problem_statement_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    item = _get_item_or_404(db, item_id)
    if item.application_id != application_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found on this application")

    try:
        return checklist_service.review_checklist_item(
            db, item_id=item_id, reviewer_id=current_user.id, decision=payload.status
        )
    except checklist_service.InvalidReviewDecisionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except checklist_service.InvalidChecklistTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))