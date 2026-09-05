"""
app/services/invite_service.py
Invite — event log for Problem Statement -> Startup invitations.

Doc C Invite decisions followed:
- #1: POST creates a plain Invite row + AuditLog: startup_invited. No
      uniqueness constraint — duplicate invites to the same startup for the
      same PS are allowed (harmless re-nudge, not an error).
- #2: "Converted" is never stored — always computed live:
      EXISTS(Application WHERE problem_statement_id=X AND startup_id=Y).
- #3: Only Officer (owner of that PS) can invite. Startup sees invites
      addressed to them via a separate read endpoint.
"""

from typing import List

from fastapi import HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.models import (
    Application,
    AuditLog,
    Invite,
    ProblemStatement,
)


def _write_audit_log(
    db: Session,
    actor_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    metadata: dict | None = None,
) -> None:
    """
    Direct insert into the shared, append-only AuditLog table (Doc A §5 —
    "insert-only, shared by convention, not by foreign key coupling").
    Doc B leaves the *general* logging pattern (decorator vs explicit calls)
    unresolved, but Doc C's Invite section explicitly locks THIS specific
    write as part of the endpoint's own contract ("#1: POST creates a plain
    Invite row + AuditLog: startup_invited") — so it's implemented directly
    here rather than deferred as a TODO.
    """
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        log_metadata=metadata,
    )
    db.add(log)
    db.commit()


def create_invite(
    db: Session,
    problem_statement_id: int,
    startup_id: int,
    actor_id: int,
) -> Invite:
    ps = db.query(ProblemStatement).filter(
        ProblemStatement.id == problem_statement_id
    ).first()
    if ps is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Problem statement not found",
        )

    invite = Invite(
        problem_statement_id=problem_statement_id,
        startup_id=startup_id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    _write_audit_log(
        db,
        actor_id=actor_id,
        action="startup_invited",
        entity_type="Invite",
        entity_id=invite.id,
        metadata={
            "problem_statement_id": problem_statement_id,
            "startup_id": startup_id,
        },
    )

    return invite


def _is_converted(db: Session, problem_statement_id: int, startup_id: int) -> bool:
    return (
        db.query(Application)
        .filter(
            Application.problem_statement_id == problem_statement_id,
            Application.startup_id == startup_id,
        )
        .first()
        is not None
    )


def list_invites_for_ps(db: Session, problem_statement_id: int) -> List[dict]:
    """
    Returns plain dicts (not ORM rows) since `converted` isn't a column —
    it's computed live per Doc C Invite #2. The response schema
    (InviteWithConversionRead) is built to accept this shape directly.
    """
    ps = db.query(ProblemStatement).filter(
        ProblemStatement.id == problem_statement_id
    ).first()
    if ps is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Problem statement not found",
        )

    invites = db.query(Invite).filter(
        Invite.problem_statement_id == problem_statement_id
    ).all()

    return [
        {
            "id": inv.id,
            "problem_statement_id": inv.problem_statement_id,
            "startup_id": inv.startup_id,
            "invited_at": inv.invited_at,
            "converted": _is_converted(db, inv.problem_statement_id, inv.startup_id),
        }
        for inv in invites
    ]


def list_invites_for_startup(db: Session, startup_id: int) -> List[Invite]:
    return db.query(Invite).filter(Invite.startup_id == startup_id).all()