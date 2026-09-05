"""
app/routers/problem_statements.py

Layer 2 — Problem Statement HTTP routes (Doc B Layer 2, Doc D "Problem Statements").

Endpoints:
    POST   /problem-statements                     (officer)
    GET    /problem-statements/{id}                 (officer-own / any authenticated)
    GET    /problem-statements                       (any authenticated, filtered by status)
    PATCH  /problem-statements/{id}                   (officer-owner)
    POST   /problem-statements/{id}/publish            (officer-owner, runs Quality Gate)
    POST   /problem-statements/{id}/close               (officer-owner, manual)
    POST   /problem-statements/{id}/ai-assist            (officer-owner, advisory only)
    POST   /problem-statements/{id}/kpis                  (officer-owner; Doc C gap-fix)
    GET    /problem-statements/{id}/kpis                   (any authenticated)

Routers own HTTP concerns + DI only — all business logic lives in
problem_statement_service.py. Ownership enforcement (officer-owner) happens
inside the service (raises PermissionError), not re-derived here, matching
the pattern already established in startup_profiles.py / auth.py.

Judgment calls flagged inline:

1. `ProblemStatementRead` includes a computed, non-column field
   (`is_locked_field_editable`). The service returns a raw ORM
   `ProblemStatement` row with no such attribute, so every endpoint that
   returns a PS builds the response via `_to_read()` below, which calls
   `problem_statement_service.is_locked_field_editable(db, ps.id)`
   separately and merges it in. Centralizing this here rather than in the
   service keeps the service's return type a plain ORM object (consistent
   with every other service in this codebase) instead of introducing a
   bespoke dict-return special case for this one model.

2. Doc D lists `GET /problem-statements/{id}` and the unfiltered `GET
   /problem-statements` as "any authenticated" (not role-restricted) — so
   both use a plain `get_current_user` dependency (any valid token/role),
   not `require_role(...)`. Same for `GET /{id}/kpis`.

3. `POST /{id}/ai-assist` calls `problem_statement_service.ai_assist_draft()`
   directly and un-guarded. That function is an intentional unimplemented
   seam (`...`) pending Teammate B's handoff — calling this endpoint before
   that handoff lands will raise at the service layer. Not stubbed out or
   special-cased here: the router's job is to wire the contract correctly,
   not to paper over an intentionally-incomplete dependency. Do not flesh
   this out further until Teammate B's master function arrives.

4. `list_problem_statements`'s `status` query param is typed as
   `Optional[PSStatusEnum]` directly (FastAPI validates against the enum
   automatically) — an invalid status string 422s before ever reaching the
   service, consistent with `startup_profiles.py`'s explicit-422-over-
   silent-fallback convention for unrecognized filter values.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.database import get_db
from app.models import PSStatusEnum, RoleEnum, User
from app.schemas.core_schemas import (
    KPICreate,
    KPIRead,
    ProblemStatementAiAssistRequest,
    ProblemStatementAiAssistResponse,
    ProblemStatementCreate,
    ProblemStatementRead,
    ProblemStatementUpdate,
)
from app.services import problem_statement_service

router = APIRouter(tags=["Problem Statements"])


# ============================================================
# Response-shaping helper (judgment call #1)
# ============================================================

def _to_read(db: Session, ps) -> ProblemStatementRead:
    """Merges the computed is_locked_field_editable flag onto the ORM row
    before handing off to the response_model for serialization."""
    return ProblemStatementRead(
        **{
            field: getattr(ps, field)
            for field in ProblemStatementRead.model_fields
            if field != "is_locked_field_editable"
        },
        is_locked_field_editable=problem_statement_service.is_locked_field_editable(db, ps.id),
    )


# ============================================================
# Create / Read
# ============================================================

@router.post("/problem-statements", response_model=ProblemStatementRead, status_code=status.HTTP_201_CREATED)
def create_problem_statement(
    payload: ProblemStatementCreate,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /problem-statements — officer only. Starts in status=draft."""
    ps = problem_statement_service.create_problem_statement(
        db, officer_id=current_user.id, data=payload.model_dump()
    )
    return _to_read(db, ps)


@router.get("/problem-statements/{ps_id}", response_model=ProblemStatementRead)
def get_problem_statement(
    ps_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /problem-statements/{id} — any authenticated (Doc D)."""
    ps = problem_statement_service.get_problem_statement(db, ps_id)
    if ps is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem statement not found")
    return _to_read(db, ps)


@router.get("/problem-statements", response_model=list[ProblemStatementRead])
def list_problem_statements(
    ps_status: Optional[PSStatusEnum] = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /problem-statements — any authenticated, optionally filtered by status."""
    rows = problem_statement_service.list_problem_statements(db, status=ps_status)
    return [_to_read(db, ps) for ps in rows]


# ============================================================
# Update
# ============================================================

@router.patch("/problem-statements/{ps_id}", response_model=ProblemStatementRead)
def update_problem_statement(
    ps_id: int,
    payload: ProblemStatementUpdate,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """PATCH /problem-statements/{id} — officer-owner. draft=any field;
    published=only locked-fields-if-zero-Applications (enforced in service)."""
    try:
        ps = problem_statement_service.update_problem_statement(
            db,
            ps_id=ps_id,
            officer_id=current_user.id,
            updates=payload.model_dump(exclude_unset=True),
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return _to_read(db, ps)


# ============================================================
# Lifecycle transitions
# ============================================================

@router.post("/problem-statements/{ps_id}/publish", response_model=ProblemStatementRead)
def publish_problem_statement(
    ps_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /problem-statements/{id}/publish — officer-owner, runs Quality Gate
    (hard null-check: baseline + measurement_method only)."""
    try:
        ps = problem_statement_service.publish_problem_statement(db, ps_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return _to_read(db, ps)


@router.post("/problem-statements/{ps_id}/close", response_model=ProblemStatementRead)
def close_problem_statement(
    ps_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /problem-statements/{id}/close — officer-owner, manual only."""
    try:
        ps = problem_statement_service.close_problem_statement(db, ps_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return _to_read(db, ps)


# ============================================================
# AI-Assist (advisory only — see judgment call #3)
# ============================================================

@router.post("/problem-statements/{ps_id}/ai-assist", response_model=ProblemStatementAiAssistResponse)
def ai_assist(
    ps_id: int,
    payload: ProblemStatementAiAssistRequest,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /problem-statements/{id}/ai-assist — officer-owner, advisory only,
    never writes/blocks. Ownership of ps_id is not separately re-validated here
    (ai_assist_draft takes no PS-scoped DB action for MVP — see service docstring);
    left for a follow-up pass if that changes once Teammate B's handoff lands."""
    return problem_statement_service.ai_assist_draft(payload.rough_text)


# ============================================================
# KPI creation (Doc C gap-fix — Layer 5 table, Layer 2 endpoint)
# ============================================================

@router.post("/problem-statements/{ps_id}/kpis", response_model=KPIRead, status_code=status.HTTP_201_CREATED)
def create_kpi(
    ps_id: int,
    payload: KPICreate,
    current_user: User = Depends(require_role(RoleEnum.officer)),
    db: Session = Depends(get_db),
):
    """POST /problem-statements/{id}/kpis — officer-owner; at/before publish,
    same zero-Applications lock as other locked fields."""
    try:
        kpi = problem_statement_service.create_kpi(
            db, ps_id=ps_id, officer_id=current_user.id, data=payload.model_dump()
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return kpi


@router.get("/problem-statements/{ps_id}/kpis", response_model=list[KPIRead])
def list_kpis(
    ps_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /problem-statements/{id}/kpis — any authenticated."""
    return problem_statement_service.list_kpis(db, ps_id)