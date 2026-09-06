"""
Service layer — Problem Statement (Layer 2). Owner: Darshan.

Covers: PS lifecycle (draft/published/closed), Quality Gate, locked-field edit
rules, AI-assist (advisory only), KPI creation (Doc C gap-fix — table is Layer 5's,
but this endpoint lives here since KPIs are created at Problem Builder time).
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Application, KPI, ProblemStatement, PSStatusEnum
from app.services import matching_service
from app.services.audit_log_service import write_audit_log

# Fields frozen post-publish once ≥1 Application exists (Doc B Layer 2 #6, PRD §4.3):
# title, category as literal columns; sensitivity_flags + additional_required_documents
# stand in for "eligibility criteria" (they drive ChecklistRule resolution). KPI rows
# are gated the same way but live in KPI table, not this one.
LOCKED_FIELDS = {"title", "category", "sensitivity_flags", "additional_required_documents"}


# ============================================================
# Locked-field / editability helpers
# ============================================================

def _application_count(db: Session, ps_id: int) -> int:
    """COUNT of Applications against this PS — drives both is_locked_field_editable
    and the PATCH-time locked-field enforcement below."""
    return db.query(Application).filter(Application.problem_statement_id == ps_id).count()


def is_locked_field_editable(db: Session, ps_id: int) -> bool:
    """True while zero Applications exist for this PS — once the first Application
    is created, locked fields freeze permanently, no override path (Doc B Layer 2 #6)."""
    return _application_count(db, ps_id) == 0


# ============================================================
# CRUD
# ============================================================

def create_problem_statement(db: Session, officer_id: int, data: dict) -> ProblemStatement:
    """POST /problem-statements — officer only. Starts in status=draft."""
    ps = ProblemStatement(officer_id=officer_id, status=PSStatusEnum.draft, **data)
    db.add(ps)
    db.commit()
    db.refresh(ps)

    write_audit_log(
        db, actor_id=officer_id, action="ps_created",
        entity_type="ProblemStatement", entity_id=ps.id,
    )
    return ps


def get_problem_statement(db: Session, ps_id: int) -> Optional[ProblemStatement]:
    """GET /problem-statements/{id}."""
    return db.query(ProblemStatement).filter(ProblemStatement.id == ps_id).first()


def list_problem_statements(db: Session, status: Optional[PSStatusEnum] = None) -> list[ProblemStatement]:
    """GET /problem-statements — any authenticated, optionally filtered by status."""
    query = db.query(ProblemStatement)
    if status is not None:
        query = query.filter(ProblemStatement.status == status)
    return query.all()


def update_problem_statement(
    db: Session, ps_id: int, officer_id: int, updates: dict
) -> ProblemStatement:
    """PATCH /problem-statements/{id} — officer-owner only.

    draft: any field editable freely.
    published: only locked-fields editable, and only while zero Applications exist
    (Doc B Layer 2 #6). Non-locked fields (target, measurement_method, budget_range,
    etc.) can still be edited post-publish regardless of Application count — the
    freeze applies specifically to LOCKED_FIELDS, not to every column.

    Every edit — locked or not — is logged as ps_field_updated (Doc B Layer 2 #7),
    with old/new values in metadata.
    """
    ps = get_problem_statement(db, ps_id)
    if ps is None:
        raise ValueError("Problem statement not found")
    if ps.officer_id != officer_id:
        raise PermissionError("Not the owning officer")

    if ps.status == PSStatusEnum.published:
        touched_locked_fields = set(updates.keys()) & LOCKED_FIELDS
        if touched_locked_fields and not is_locked_field_editable(db, ps_id):
            raise ValueError(
                f"Locked fields {touched_locked_fields} cannot be edited: "
                f"Applications already exist for this Problem Statement"
            )

    old_values = {field: getattr(ps, field) for field in updates}
    for field, value in updates.items():
        setattr(ps, field, value)

    db.commit()
    db.refresh(ps)

    write_audit_log(
        db, actor_id=officer_id, action="ps_field_updated",
        entity_type="ProblemStatement", entity_id=ps.id,
        metadata={"old_values": old_values, "new_values": updates},
    )

    # SEMANTIC MATCHING: re-index only if (a) this PS has already been
    # published (draft PSs aren't indexed at all — see publish_problem_statement)
    # AND (b) `description` was actually part of this update — re-embedding
    # on every unrelated field edit (e.g. budget_range) would be wasted work.
    # `description` is not in LOCKED_FIELDS, so it stays editable post-publish
    # regardless of Application count, which is exactly the case this
    # re-index needs to handle. Best-effort, never raises.
    if ps.status == PSStatusEnum.published and "description" in updates:
        matching_service.store_problem_statement_description(ps.id, ps.description)

    return ps


# ============================================================
# Lifecycle transitions
# ============================================================

def publish_problem_statement(db: Session, ps_id: int, officer_id: int) -> ProblemStatement:
    """POST /problem-statements/{id}/publish — officer-owner, runs Quality Gate.

    Quality Gate (Doc B Layer 2 #2, PRD §4.2) is a HARD null-check on exactly two
    fields: baseline and measurement_method. The "outcome-based description" check
    is advisory-only (surfaced via ai_assist below) and never blocks here.
    """
    ps = get_problem_statement(db, ps_id)
    if ps is None:
        raise ValueError("Problem statement not found")
    if ps.officer_id != officer_id:
        raise PermissionError("Not the owning officer")
    if ps.status != PSStatusEnum.draft:
        raise ValueError("Only a draft Problem Statement can be published")

    missing = []
    if not ps.baseline:
        missing.append("baseline")
    if not ps.measurement_method:
        missing.append("measurement_method")
    if missing:
        raise ValueError(f"Quality Gate failed — missing required field(s): {missing}")

    ps.status = PSStatusEnum.published
    ps.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ps)

    write_audit_log(
        db, actor_id=officer_id, action="ps_published",
        entity_type="ProblemStatement", entity_id=ps.id,
    )

    # SEMANTIC MATCHING (Teammate B handoff): index the PS description at
    # publish time, not at draft creation. Judgment call: a draft PS is not
    # discoverable/matchable to anyone yet (Doc B framing — publish is the
    # "goes live" moment), so indexing it earlier would let a startup's
    # match query surface a PS that isn't actually open for applications.
    # Publish is also the point this session's brainstorm anchors "run the
    # ranking" to — indexing here means GET /problem-statements/{id}/matches
    # is queryable by officers the instant publish succeeds. Best-effort,
    # never raises (see matching_service judgment call #2) — a Chroma
    # hiccup must never block a publish from succeeding.
    matching_service.store_problem_statement_description(ps.id, ps.description)

    return ps


def close_problem_statement(db: Session, ps_id: int, officer_id: int) -> ProblemStatement:
    """POST /problem-statements/{id}/close — officer-owner, manual only, no auto-close
    (Doc B Layer 2 #4 — no application_deadline field exists). Only blocks NEW
    Applications; existing Applications proceed independently (Doc B Layer 2 #8)."""
    ps = get_problem_statement(db, ps_id)
    if ps is None:
        raise ValueError("Problem statement not found")
    if ps.officer_id != officer_id:
        raise PermissionError("Not the owning officer")
    if ps.status != PSStatusEnum.published:
        raise ValueError("Only a published Problem Statement can be closed")

    ps.status = PSStatusEnum.closed
    db.commit()
    db.refresh(ps)

    write_audit_log(
        db, actor_id=officer_id, action="ps_closed",
        entity_type="ProblemStatement", entity_id=ps.id,
    )
    return ps


# ============================================================
# AI-Assist (advisory only — never writes, never blocks)
# ============================================================

def ai_assist_draft(rough_text: str) -> dict:
    """POST /problem-statements/{id}/ai-assist — officer-owner, advisory only.

    Suggests: a candidate baseline question, a plausible measurement method,
    and whether the description reads as outcome-based vs. tech-prescriptive
    (with a rewrite suggestion if not). Never writes to the PS row and never
    gates publish (PRD §4.2.1) — officer reviews/edits/approves every field
    themselves before it's saved via update_problem_statement().

    Actual LLM call/prompt construction is not modeled here — this function is
    the seam where that call happens; return shape matches
    ProblemStatementAiAssistResponse.
    """
    ...


# ============================================================
# KPI creation (Doc C gap-fix — Layer 5 table, Layer 2 endpoint)
# ============================================================

def create_kpi(db: Session, ps_id: int, officer_id: int, data: dict) -> KPI:
    """POST /problem-statements/{id}/kpis — officer-owner; at/before publish per
    Doc C Stage D #1. Table already existed in the locked schema (Layer 5's KPI),
    this was a missing CRUD path, not a schema change.

    KPIs are grouped with the locked-field set (title, category, KPIs, eligibility
    criteria — PRD §4.3), so the same zero-Applications gate as LOCKED_FIELDS
    applies here: once the first Application exists for this PS, no new KPI rows
    may be created either.
    """
    ps = get_problem_statement(db, ps_id)
    if ps is None:
        raise ValueError("Problem statement not found")
    if ps.officer_id != officer_id:
        raise PermissionError("Not the owning officer")
    if not is_locked_field_editable(db, ps_id):
        raise ValueError(
            "KPIs cannot be added: Applications already exist for this Problem Statement"
        )

    kpi = KPI(problem_statement_id=ps_id, **data)
    db.add(kpi)
    db.commit()
    db.refresh(kpi)

    write_audit_log(
        db, actor_id=officer_id, action="kpi_created",
        entity_type="KPI", entity_id=kpi.id,
    )
    return kpi


def list_kpis(db: Session, ps_id: int) -> list[KPI]:
    """GET /problem-statements/{id}/kpis — any authenticated."""
    return db.query(KPI).filter(KPI.problem_statement_id == ps_id).all()