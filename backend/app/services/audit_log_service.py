"""
app/services/audit_log_service.py

Cross-cutting append-only audit logging, shared by every layer (Doc A §5,
Doc B "AuditLog — Cross-Cutting", PRD §12/§16).

Design notes / judgment calls (flagging per convention — none of these are
spelled out verbatim in the PRD/docs, so recording the reasoning inline):

1. Single write function, no update/delete exposed anywhere in this file.
   AuditLog is insert-only by architectural decision (models.py docstring,
   Doc B). There is intentionally no `update_audit_log` or `delete_audit_log`
   — that omission IS the enforcement mechanism at this layer. DB-level
   REVOKE UPDATE/DELETE is a defense-in-depth item for later, not blocking.

2. `actor_id` is nullable on the model (system-triggered events, e.g. the
   auto EligibilityCheck creation on submit, have no human actor). This
   function accepts `actor_id: Optional[int] = None` for that reason —
   caller passes None explicitly for system-triggered actions rather than
   us guessing a sentinel "system" user id.

3. This function does NOT commit the session. Every mutating service
   function (per project convention) calls write_audit_log(...) as part of
   its own transaction alongside the actual state change, then commits once.
   Committing here would either (a) force a separate transaction per audit
   row, breaking atomicity with the state change it's describing, or
   (b) silently commit the caller's uncommitted work early. We flush (not
   commit) so the row gets a real id/timestamp if the caller needs to
   reference it (e.g. returning it in a response), without ending the
   transaction.

4. No read/query helpers (list_audit_logs, get_audit_log, etc.) included
   here yet. Nothing in the current file list calls for reading AuditLog
   back out — ComplianceRecord generation (Layer 5, not ours) and any
   future admin audit-log viewer endpoint are the two obvious future
   consumers. Adding a read function now would be speculative; deferred
   until a real caller needs it.

5. `metadata` param name avoided (reserved on SQLAlchemy's declarative Base,
   per the model's own comment) — kept as `metadata` in this function's
   *signature* since that's the natural/expected kwarg name for callers,
   but mapped onto the model's `log_metadata` column internally. Callers
   should never need to know the column was renamed.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit_log(
    db: Session,
    actor_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: int,
    metadata: Optional[dict] = None,
) -> AuditLog:
    """
    Create and flush a single append-only AuditLog row.

    Does NOT commit — caller's surrounding transaction owns the commit,
    so the audit entry lands atomically with the state change it records.

    Args:
        db: active SQLAlchemy session (caller's transaction).
        actor_id: FK -> User.id, or None for system-triggered actions
            (e.g. automatic EligibilityCheck creation on Application submit).
        action: short string describing what happened, e.g.
            "ps_published", "application_submitted", "score_recorded",
            "ps_field_updated". Free-text by convention (Doc B) — no
            enum exists or is planned for MVP.
        entity_type: name of the affected table/entity, e.g.
            "ProblemStatement", "Application". Free-text, matches the
            class name of the mutated model by convention.
        entity_id: PK of the affected row.
        metadata: optional JSON-serializable dict for extra context
            (e.g. old/new value on a locked-field edit, or the `reason`
            string for mark_application_not_selected). None if not needed.

    Returns:
        The created AuditLog instance (flushed, has .id and .timestamp
        populated, but not yet committed).
    """
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        log_metadata=metadata,
    )
    db.add(entry)
    db.flush()
    return entry