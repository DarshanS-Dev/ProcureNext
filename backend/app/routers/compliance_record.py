# ============================================================
# app/routers/compliance_record.py
#
# ASSUMPTIONS (adjust to match your real codebase):
# - app.database.get_db is your DB session dependency
# - app.auth.get_current_user returns an object with .id and .role
# - Router is mounted in main.py, e.g.:
#     app.include_router(compliance_record.router)
#
# Doc D role note: CAG/Audit Body has read-only access "via Admin view" —
# there is no `cag` value in RoleEnum (models.py only defines officer,
# startup, evaluator, independent_evaluator, admin), so CAG access is
# modeled here simply as admin-gated, matching the PRD's "via Admin view"
# phrasing rather than a separate role check that doesn't exist yet.
# ============================================================

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.execution_schemas import ComplianceRecordRead
from app.services import compliance_record_service

router = APIRouter(tags=["compliance-record"])


def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access only",
        )
    return user


@router.post(
    "/admin/applications/{application_id}/compliance-record",
    response_model=ComplianceRecordRead,
    status_code=201,
)
def create_compliance_record(
    application_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    return compliance_record_service.generate_compliance_record(
        db=db,
        application_id=application_id,
        generated_by=user.id,
    )


@router.get(
    "/admin/applications/{application_id}/compliance-records",
    response_model=List[ComplianceRecordRead],
)
def list_compliance_records(
    application_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    return compliance_record_service.list_compliance_records(db=db, application_id=application_id)


@router.get(
    "/admin/compliance-records/{record_id}",
    response_model=ComplianceRecordRead,
)
def get_compliance_record(
    record_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    return compliance_record_service.get_compliance_record(db=db, record_id=record_id)