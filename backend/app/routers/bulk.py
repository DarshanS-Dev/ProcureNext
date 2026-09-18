"""
app/routers/bulk.py

Bulk / "mine" HTTP routes — BACKEND_PERFORMANCE.md P0-1.

Endpoints:
    GET    /officer/applications                  (officer, self)
    GET    /admin/applications                     (admin)
    GET    /evaluator/problem-statements             (evaluator, self)
    GET    /eligibility-checks?application_ids=       (officer/admin)
    GET    /officer/contracts                          (officer, self)

All five reuse existing response_models (ApplicationRead, ProblemStatementRead,
EligibilityCheckRead, ContractRead) — no new schemas needed, these are just
new query shapes over data the caller already has access to via the
per-row endpoints.

Judgment calls flagged inline:

1. GET /problem-statements/{id} already returns a computed
   is_locked_field_editable field via problem_statements.py's `_to_read()`
   helper. get_evaluator_problem_statements returns raw ORM rows (no
   Application-count check needed for an evaluator's read-only dashboard
   view), so this router reuses the SAME `_to_read` pattern — imported
   from problem_statements.py rather than duplicated — to keep the
   response shape consistent with every other ProblemStatementRead caller.

2. GET /officer/applications and GET /admin/applications intentionally do
   NOT accept problem_statement_id/startup_id filters the way the existing
   GET /applications does (applications.py) — they are the *unfiltered,
   scoped-to-caller* bulk read that replaces the old per-PS fan-out
   entirely. If a caller needs one PS's applications specifically, the
   existing GET /applications?problem_statement_id= still works fine for
   that single case.

3. GET /eligibility-checks takes application_ids as a comma-separated query
   string (matching Doc-established convention of simple query params over
   this codebase, e.g. status filters elsewhere) rather than a POST body —
   this is a read, so GET is kept even though the id list could get long;
   no pagination/length cap added yet, flagged as a follow-up if a caller
   ever needs to bulk-fetch hundreds of ids at once.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.models import RoleEnum, User
from app.schemas.core_schemas import (
    ApplicationRead,
    EligibilityCheckRead,
    ProblemStatementRead,
)
from app.schemas.execution_schemas import ContractRead
from app.services import bulk_read_service
from app.routers.problem_statements import _to_read as _ps_to_read

router = APIRouter(tags=["Bulk Reads"])


# ============================================================
# Officer — applications
# ============================================================

@router.get("/officer/applications", response_model=List[ApplicationRead])
def get_officer_applications(
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """GET /officer/applications — officer, self. One query across every
    PS this officer owns (see judgment call #2 re: no filter params)."""
    return bulk_read_service.get_officer_applications(db, officer_id=current_user.id)


# ============================================================
# Admin — every application
# ============================================================

@router.get("/admin/applications", response_model=List[ApplicationRead])
def get_all_applications(
    current_user: User = Depends(require_role(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /admin/applications — admin only. Platform-wide, unfiltered."""
    return bulk_read_service.get_all_applications(db)


# ============================================================
# Evaluator — assigned problem statements
# ============================================================

@router.get("/evaluator/problem-statements", response_model=List[ProblemStatementRead])
def get_evaluator_problem_statements(
    current_user: User = Depends(require_role(RoleEnum.evaluator)),
    db: Session = Depends(get_db),
):
    """GET /evaluator/problem-statements — evaluator, self. Replaces
    GET /problem-statements + N× GET /problem-statements/{id}/evaluators."""
    rows = bulk_read_service.get_evaluator_problem_statements(db, evaluator_id=current_user.id)
    return [_ps_to_read(db, ps) for ps in rows]


# ============================================================
# Bulk EligibilityCheck read
# ============================================================

@router.get("/eligibility-checks", response_model=List[EligibilityCheckRead])
def get_bulk_eligibility_checks(
    application_ids: str = Query(
        ..., description="Comma-separated application ids, e.g. '1,2,3'"
    ),
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """GET /eligibility-checks?application_ids=1,2,3 — officer/admin.
    Officer only receives rows for applications under a PS they own;
    admin receives any requested id that exists (judgment call #5 in
    bulk_read_service.py)."""
    try:
        ids = [int(x) for x in application_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="application_ids must be a comma-separated list of integers",
        )

    if not ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="application_ids must contain at least one id",
        )

    return bulk_read_service.get_bulk_eligibility_checks(
        db,
        application_ids=ids,
        requesting_user_id=current_user.id,
        requesting_user_role=current_user.role,
    )


# ============================================================
# Officer — contracts
# ============================================================

@router.get("/officer/contracts", response_model=List[ContractRead])
def get_officer_contracts(
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """GET /officer/contracts — officer, self. Replaces
    N× GET /applications/{id}/contract."""
    return bulk_read_service.get_officer_contracts(db, officer_id=current_user.id)