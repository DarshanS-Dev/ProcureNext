"""
app/services/checklist_service.py

Layer 4, Stage 1 — Dynamic Checklist Resolution (Doc B Stage 1, PRD §5.3/§7.1/§16).

Owns:
- Synchronous checklist resolution at Application creation time
  (called from application_service.create_application, same transaction).
- Startup upload of a ChecklistItem (status -> uploaded).
- Officer/Admin review of a ChecklistItem (status -> verified/rejected).
- Read helpers: list items for an application, and completeness check
  (used later by decision_readiness_service.py and elsewhere).

Hard rule (Doc B Stage 1 #4): "complete" means every ChecklistItem is at
status=uploaded OR further (verified also counts) — NOT strictly verified.
Requiring verified would create an unbounded human bottleneck before
Stage 2's auto-open gate (EligibilityCheck.overall_result=eligible fires
independently of checklist state entirely per Doc B Stage 2 #2 — checklist
completeness is not itself a gate on anything in Layer 3/4 for MVP; it's
tracked for visibility/ComplianceRecord purposes).

Judgment calls flagged inline (no schema/PRD line to point to):

1. `resolve_checklist_for_application` logs an AuditLog entry
   (`checklist_resolved`) summarizing the resolved document list. Doc B
   Stage 1 doesn't explicitly call for an audit entry at resolution time
   (only upload/review are implied elsewhere), but resolution creates rows
   (a mutation), and the project convention is "every mutating service
   function logs to AuditLog." Defaulting to log it. If zero items result,
   still logs (with an empty list) rather than skipping, for consistency —
   confirms the resolution step ran rather than silently having done
   nothing.

2. Re-upload after rejection: Doc B Stage 1 #5 says "no formal
   revert/override workflow if a bad document is caught post-eligibility —
   Officer discretion + AuditLog only," but is silent on whether a startup
   may simply re-submit a new file against the same rejected item. Doc C's
   milestone-review stage (Stage C #5) explicitly models the analogous
   case for PilotMilestone — rejected -> startup resubmits new Evidence ->
   status returns to submitted, Officer/Independent Evaluator discretion,
   AuditLog only — and states this pattern mirrors Layer 4 Stage 1 for
   consistency. Mirroring that back here: `upload_checklist_item` accepts
   uploads against `pending` OR `rejected` items, transitioning either to
   `uploaded`. Uploading against an already-`verified` item is rejected
   (no reason to re-upload something already accepted).

3. Ownership checks (startup uploading only their own application's items;
   officer/admin reviewing only items under their own PS) are assumed to
   be enforced at the router/DI layer via `require_role(...)` plus an
   explicit owner comparison there, consistent with how
   `problem_statement_service.update_problem_statement` and
   `application_service` handle officer-ownership checks inline. Since
   this service function only receives `item_id` (not the caller's role
   context) I do NOT re-derive ownership here from application/PS lookups
   -- that would duplicate router-layer logic and risk drifting out of
   sync with however auth/dependencies.py resolves "own". If this
   assumption is wrong, ownership checks should be added here instead.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Application,
    ChecklistItem,
    ChecklistRule,
    ChecklistStatusEnum,
    ProblemStatement,
)
from app.services import audit_log_service


# ============================================================
# Errors
# ============================================================

class ChecklistServiceError(Exception):
    """Base error for checklist_service — routers translate to HTTP."""


class ChecklistItemNotFoundError(ChecklistServiceError):
    pass


class InvalidChecklistTransitionError(ChecklistServiceError):
    pass


class InvalidReviewDecisionError(ChecklistServiceError):
    pass


# ============================================================
# Resolution (Doc B Stage 1 #1-#3)
# ============================================================

def resolve_checklist_for_application(db: Session, application: Application) -> list[ChecklistItem]:
    """
    Resolves and creates ChecklistItem rows for a newly-created Application.
    Called synchronously inside the same transaction as Application creation
    (Doc B Stage 1 #1) — does NOT commit; caller (application_service) owns
    the single commit for that transaction.

    Resolution = union of (Doc B Stage 1 #2):
      (a) ChecklistRule rows where category == PS.category
      (b) ChecklistRule rows where sensitivity_tag is in PS.sensitivity_flags
      (c) PS.additional_required_documents (plain document-name strings,
          not backed by ChecklistRule rows)

    Deduplicated by document_name — a document required by both category
    and sensitivity match should not produce two ChecklistItem rows.

    Zero resulting rows is valid (Doc B Stage 1 #3) — does not block
    Application creation, returns an empty list.
    """
    ps = (
        db.query(ProblemStatement)
        .filter(ProblemStatement.id == application.problem_statement_id)
        .first()
    )
    if ps is None:
        raise ChecklistServiceError(
            f"ProblemStatement {application.problem_statement_id} not found "
            f"while resolving checklist for application {application.id}"
        )

    document_names: set[str] = set()

    # (a) category-matched rules
    category_rules = (
        db.query(ChecklistRule).filter(ChecklistRule.category == ps.category).all()
    )
    document_names.update(rule.document_name for rule in category_rules)

    # (b) sensitivity-matched rules
    sensitivity_flags = ps.sensitivity_flags or []
    if sensitivity_flags:
        sensitivity_rules = (
            db.query(ChecklistRule)
            .filter(ChecklistRule.sensitivity_tag.in_(sensitivity_flags))
            .all()
        )
        document_names.update(rule.document_name for rule in sensitivity_rules)

    # (c) PS-specific one-off additions
    additional_docs = ps.additional_required_documents or []
    document_names.update(additional_docs)

    created_items: list[ChecklistItem] = []
    for document_name in sorted(document_names):
        item = ChecklistItem(
            application_id=application.id,
            document_name=document_name,
            status=ChecklistStatusEnum.pending,
        )
        db.add(item)
        created_items.append(item)

    if created_items:
        db.flush()  # populate item.id values before logging/returning

    # JUDGMENT CALL #1: log resolution even when zero items result, so the
    # audit trail confirms resolution ran rather than looking like it never
    # happened.
    audit_log_service.write_audit_log(
        db,
        actor_id=None,  # system-triggered, part of Application creation flow
        action="checklist_resolved",
        entity_type="Application",
        entity_id=application.id,
        metadata={"document_names": sorted(document_names)},
    )

    return created_items


# ============================================================
# Startup upload
# ============================================================

def upload_checklist_item(
    db: Session, item_id: int, uploaded_by: int, file_reference: str
) -> ChecklistItem:
    """
    PATCH /applications/{id}/checklist/{item_id} — startup-own.

    Valid from status=pending OR status=rejected (JUDGMENT CALL #2 — mirrors
    Doc C Stage C #5's milestone re-submission pattern). Invalid from
    status=uploaded (already awaiting review) or status=verified (already
    accepted, no reason to re-upload).
    """
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if item is None:
        raise ChecklistItemNotFoundError(f"ChecklistItem {item_id} not found")

    if item.status not in (ChecklistStatusEnum.pending, ChecklistStatusEnum.rejected):
        raise InvalidChecklistTransitionError(
            f"Cannot upload against ChecklistItem {item_id} in status={item.status.value}"
        )

    previous_status = item.status.value
    item.file_reference = file_reference
    item.status = ChecklistStatusEnum.uploaded
    # Uploading a fresh file clears any stale reviewer info from a prior
    # rejection — the new file hasn't been reviewed yet.
    item.reviewed_by = None
    item.reviewed_at = None

    audit_log_service.write_audit_log(
        db,
        actor_id=uploaded_by,
        action="checklist_item_uploaded",
        entity_type="ChecklistItem",
        entity_id=item.id,
        metadata={"previous_status": previous_status},
    )

    db.commit()
    db.refresh(item)
    return item


# ============================================================
# Officer/Admin review
# ============================================================

def review_checklist_item(
    db: Session,
    item_id: int,
    reviewer_id: int,
    decision: ChecklistStatusEnum,
) -> ChecklistItem:
    """
    PATCH /applications/{id}/checklist/{item_id}/review — officer/admin.

    `decision` must be verified or rejected. No formal revert/override
    workflow beyond this (Doc B Stage 1 #5) — Officer discretion +
    AuditLog only; a rejected item can later be re-uploaded via
    upload_checklist_item (JUDGMENT CALL #2 above).
    """
    if decision not in (ChecklistStatusEnum.verified, ChecklistStatusEnum.rejected):
        raise InvalidReviewDecisionError(
            f"Review decision must be verified or rejected, got {decision}"
        )

    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if item is None:
        raise ChecklistItemNotFoundError(f"ChecklistItem {item_id} not found")

    if item.status != ChecklistStatusEnum.uploaded:
        raise InvalidChecklistTransitionError(
            f"Cannot review ChecklistItem {item_id} in status={item.status.value} "
            f"— only items in status=uploaded may be reviewed"
        )

    item.status = decision
    item.reviewed_by = reviewer_id
    item.reviewed_at = datetime.now(timezone.utc)

    audit_log_service.write_audit_log(
        db,
        actor_id=reviewer_id,
        action="checklist_item_reviewed",
        entity_type="ChecklistItem",
        entity_id=item.id,
        metadata={"decision": decision.value},
    )

    db.commit()
    db.refresh(item)
    return item


# ============================================================
# Reads
# ============================================================

def get_checklist_for_application(db: Session, application_id: int) -> list[ChecklistItem]:
    """GET /applications/{id}/checklist — startup-own/officer/admin."""
    return (
        db.query(ChecklistItem)
        .filter(ChecklistItem.application_id == application_id)
        .all()
    )


def is_checklist_complete(db: Session, application_id: int) -> bool:
    """
    "Complete" = every ChecklistItem for this application is at status
    uploaded OR verified (Doc B Stage 1 #4 — verified is a strict superset
    of uploaded, not a separate incomplete bucket). Zero items = trivially
    complete. Used by decision_readiness_service.py / ComplianceRecord
    context later — not itself a gate on any Layer 3/4 transition for MVP.
    """
    items = get_checklist_for_application(db, application_id)
    if not items:
        return True
    return all(
        item.status in (ChecklistStatusEnum.uploaded, ChecklistStatusEnum.verified)
        for item in items
    )