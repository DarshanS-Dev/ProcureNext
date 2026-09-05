"""
app/services/evaluator_service.py

Layer 4, Stage 2 — Evaluator Assignment + COI Declarations (Doc B Stage 2, PRD §7.1/§16).

Owns:
- Initial PS evaluator assignment (admin-only, POST /problem-statements/{id}/evaluators)
  — blocks duplicate (unique constraint Q1 locked) but allows zero evaluators pre-publish
  (Doc B Stage 2 #1).
- Replacement via recusal: POST /problem-statements/{id}/evaluators/replace
  — inserts new PSEvaluatorAssignment, leaves old row untouched (old evaluator stays
  assigned to PS even though recused on one application — Q2 locked).
- COI declaration: POST /applications/{id}/coi-declaration — evaluator must exist
  (recusive check Q4 locked), insert-only (unique constraint Q3 locked, mirrors
  scoring_service.py's pattern), auto-sets recused=True if declared_conflict=True.
- Read helpers: get assignments for a PS, get COI declaration for an application/evaluator,
  list unrecused evaluators for stage-3-completeness checks.

Hard rule (Q4 locked): both COI declaration and scoring require the evaluator to have
an active PSEvaluatorAssignment for that application's PS. This is a NEW gate enforced
here and retroactively in scoring_service.submit_scores (flagged as a SEAM there to patch).

Judgment calls flagged inline (no schema/PRD line to point to):

1. On assignment creation with zero existing evaluators for a PS: Doc B Stage 2 #1
   explicitly allows publish with zero evaluators. Logging this first assignment is
   useful for audit trail, but it's not a "gate opened" event like eligibility flow
   produces. Same log pattern as everywhere else — just records the action.

2. Replacement (recusal path): recused=True is set by auto-logic IF declared_conflict
   is true; if declared_conflict=false, recused=false initially (could theoretically
   stay false if an Admin just wants to swap evaluators for non-COI reasons, though
   "replace" endpoint is only used per Doc B for COI recusal in practice). Setting
   recused server-side on the new evaluator — no input param for it.

3. On replacement: new evaluator is inserted with their own assigned_by (the admin doing
   the replacement). Old evaluator's row is never touched — they remain assigned to the
   PS (recused status is per-application via COIDeclaration, not a PS-level property).

4. COI declaration: if evaluator doesn't exist (FK check), if application doesn't exist
   (FK check), if evaluator not assigned to that PS (Q4 gate), all raise. Trying to
   declare COI for an application where you're not assigned fails cleanly.

5. "Unrecused evaluators" helper (used by scoring_service for completeness checks):
   returns active_evaluator_ids = assigned_evaluator_ids - recused_evaluator_ids
   for a specific application. This is split by application because recusal is
   per-application, not PS-wide.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Application,
    COIDeclaration,
    ProblemStatement,
    PSEvaluatorAssignment,
    User,
)
from app.services import audit_log_service


# ============================================================
# Errors
# ============================================================

class EvaluatorServiceError(Exception):
    """Base error for evaluator_service — routers translate to HTTP."""


class ProblemStatementNotFoundError(EvaluatorServiceError):
    pass


class UserNotFoundError(EvaluatorServiceError):
    pass


class ApplicationNotFoundError(EvaluatorServiceError):
    pass


class DuplicateAssignmentError(EvaluatorServiceError):
    """Raised when attempting to assign an evaluator already assigned to that PS."""


class EvaluatorNotAssignedError(EvaluatorServiceError):
    """Raised when an evaluator tries to declare COI or score without being
    assigned to the application's PS (Q4 locked gate)."""


class DuplicateCOIDeclarationError(EvaluatorServiceError):
    """Raised when attempting to resubmit a COI declaration for the same
    (application, evaluator) pair (Q3 locked, insert-only)."""


class COIDeclarationNotFoundError(EvaluatorServiceError):
    pass


# ============================================================
# Evaluator Assignment
# ============================================================

def assign_evaluator(
    db: Session, problem_statement_id: int, evaluator_id: int, assigned_by: int
) -> PSEvaluatorAssignment:
    """
    POST /problem-statements/{id}/evaluators — admin only.

    Assigns an evaluator to a PS. Admin may assign evaluators pre-publish (Stage 2 #1),
    and a PS may be published with zero evaluators (no gating). Blocks duplicate
    assignment via unique constraint (Q1 locked).

    Raises DuplicateAssignmentError if the evaluator is already assigned to this PS.
    """
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    if ps is None:
        raise ProblemStatementNotFoundError(f"ProblemStatement {problem_statement_id} not found")

    evaluator = db.query(User).filter(User.id == evaluator_id).first()
    if evaluator is None:
        raise UserNotFoundError(f"User {evaluator_id} not found")

    existing = (
        db.query(PSEvaluatorAssignment)
        .filter(
            PSEvaluatorAssignment.problem_statement_id == problem_statement_id,
            PSEvaluatorAssignment.evaluator_id == evaluator_id,
        )
        .first()
    )
    if existing is not None:
        raise DuplicateAssignmentError(
            f"Evaluator {evaluator_id} is already assigned to ProblemStatement {problem_statement_id}"
        )

    assignment = PSEvaluatorAssignment(
        problem_statement_id=problem_statement_id,
        evaluator_id=evaluator_id,
        assigned_by=assigned_by,
    )
    db.add(assignment)

    audit_log_service.write_audit_log(
        db,
        actor_id=assigned_by,
        action="evaluator_assigned",
        entity_type="PSEvaluatorAssignment",
        entity_id=assignment.id,
        metadata={"problem_statement_id": problem_statement_id, "evaluator_id": evaluator_id},
    )

    db.commit()
    db.refresh(assignment)
    return assignment


def replace_evaluator(
    db: Session,
    problem_statement_id: int,
    new_evaluator_id: int,
    old_evaluator_id: int,
    recused_application_id: int,
    replaced_by: int,
) -> PSEvaluatorAssignment:
    """
    POST /problem-statements/{id}/evaluators/replace — admin only.

    Recusal path: old evaluator is marked recused on one application, new evaluator
    is assigned to the PS (Q2 locked: old row untouched, both now assigned to PS;
    "replace" is a misnomer, really "add replacement").

    - Old evaluator's PSEvaluatorAssignment row is left untouched.
    - New evaluator gets a fresh PSEvaluatorAssignment row.
    - A COIDeclaration(application_id=recused_application_id, evaluator_id=old_evaluator_id,
      recused=True) is created for the old evaluator on that one application.
    - New evaluator starts unrecused (no COI row automatically created).

    Both old and new evaluators must exist (or raise UserNotFoundError).
    """
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    if ps is None:
        raise ProblemStatementNotFoundError(f"ProblemStatement {problem_statement_id} not found")

    old_evaluator = db.query(User).filter(User.id == old_evaluator_id).first()
    if old_evaluator is None:
        raise UserNotFoundError(f"Old evaluator {old_evaluator_id} not found")

    new_evaluator = db.query(User).filter(User.id == new_evaluator_id).first()
    if new_evaluator is None:
        raise UserNotFoundError(f"New evaluator {new_evaluator_id} not found")

    recused_application = (
        db.query(Application).filter(Application.id == recused_application_id).first()
    )
    if recused_application is None:
        raise ApplicationNotFoundError(f"Application {recused_application_id} not found")

    # Verify old evaluator is actually assigned to this PS
    old_assignment = (
        db.query(PSEvaluatorAssignment)
        .filter(
            PSEvaluatorAssignment.problem_statement_id == problem_statement_id,
            PSEvaluatorAssignment.evaluator_id == old_evaluator_id,
        )
        .first()
    )
    if old_assignment is None:
        raise EvaluatorServiceError(
            f"Old evaluator {old_evaluator_id} is not assigned to ProblemStatement {problem_statement_id}"
        )

    # Check if new evaluator is already assigned (avoid duplicate)
    new_assignment_existing = (
        db.query(PSEvaluatorAssignment)
        .filter(
            PSEvaluatorAssignment.problem_statement_id == problem_statement_id,
            PSEvaluatorAssignment.evaluator_id == new_evaluator_id,
        )
        .first()
    )
    if new_assignment_existing is not None:
        raise DuplicateAssignmentError(
            f"New evaluator {new_evaluator_id} is already assigned to ProblemStatement {problem_statement_id}"
        )

    # Assign new evaluator
    new_assignment = PSEvaluatorAssignment(
        problem_statement_id=problem_statement_id,
        evaluator_id=new_evaluator_id,
        assigned_by=replaced_by,
    )
    db.add(new_assignment)
    db.flush()

    # Mark old evaluator as recused on this one application (Q2: old row untouched)
    existing_coi = (
        db.query(COIDeclaration)
        .filter(
            COIDeclaration.application_id == recused_application_id,
            COIDeclaration.evaluator_id == old_evaluator_id,
        )
        .first()
    )

    if existing_coi is not None:
        # COI row already exists (evaluator had declared conflict before or was already
        # recused) — just make sure recused=True
        existing_coi.recused = True
    else:
        # Create a new COI row for the old evaluator, marked as recused
        coi_entry = COIDeclaration(
            application_id=recused_application_id,
            evaluator_id=old_evaluator_id,
            declared_conflict=True,  # replacement implies conflict
            recused=True,
        )
        db.add(coi_entry)

    audit_log_service.write_audit_log(
        db,
        actor_id=replaced_by,
        action="evaluator_replaced",
        entity_type="PSEvaluatorAssignment",
        entity_id=new_assignment.id,
        metadata={
            "old_evaluator_id": old_evaluator_id,
            "new_evaluator_id": new_evaluator_id,
            "recused_application_id": recused_application_id,
        },
    )

    db.commit()
    db.refresh(new_assignment)
    return new_assignment


# ============================================================
# COI Declaration
# ============================================================

def declare_coi(
    db: Session,
    application_id: int,
    evaluator_id: int,
    declared_conflict: bool,
) -> COIDeclaration:
    """
    POST /applications/{id}/coi-declaration — evaluator-own.

    Mandatory before scoring (Doc B Stage 2 #4). If declared_conflict=True,
    auto-sets recused=True (Q2 locked). Insert-only, no resubmission allowed
    (Q3 locked, unique constraint).

    Q4 locked gate: evaluator must be assigned to the application's PS.
    If not assigned, raises EvaluatorNotAssignedError.

    Raises:
      - ApplicationNotFoundError if application doesn't exist
      - UserNotFoundError if evaluator doesn't exist
      - EvaluatorNotAssignedError if evaluator not assigned to this app's PS (Q4)
      - DuplicateCOIDeclarationError if a declaration already exists for this pair (Q3)
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    evaluator = db.query(User).filter(User.id == evaluator_id).first()
    if evaluator is None:
        raise UserNotFoundError(f"User {evaluator_id} not found")

    # Q4 locked gate: evaluator must be assigned to the application's PS
    assignment = (
        db.query(PSEvaluatorAssignment)
        .filter(
            PSEvaluatorAssignment.problem_statement_id == application.problem_statement_id,
            PSEvaluatorAssignment.evaluator_id == evaluator_id,
        )
        .first()
    )
    if assignment is None:
        raise EvaluatorNotAssignedError(
            f"Evaluator {evaluator_id} is not assigned to ProblemStatement {application.problem_statement_id}"
        )

    # Q3 locked: check for duplicate (unique constraint + insert-only)
    existing_coi = (
        db.query(COIDeclaration)
        .filter(
            COIDeclaration.application_id == application_id,
            COIDeclaration.evaluator_id == evaluator_id,
        )
        .first()
    )
    if existing_coi is not None:
        raise DuplicateCOIDeclarationError(
            f"COI declaration already exists for evaluator {evaluator_id} on application {application_id}"
        )

    recused = declared_conflict  # auto-set if conflict declared
    coi = COIDeclaration(
        application_id=application_id,
        evaluator_id=evaluator_id,
        declared_conflict=declared_conflict,
        recused=recused,
    )
    db.add(coi)

    audit_log_service.write_audit_log(
        db,
        actor_id=evaluator_id,
        action="coi_declared",
        entity_type="COIDeclaration",
        entity_id=coi.id,
        metadata={"declared_conflict": declared_conflict},
    )

    db.commit()
    db.refresh(coi)
    return coi


# ============================================================
# Reads
# ============================================================

def get_ps_evaluators(db: Session, problem_statement_id: int) -> list[PSEvaluatorAssignment]:
    """
    GET /problem-statements/{id}/evaluators — flat list of assigned evaluators
    (Q5 locked: no per-application recusal join — recusal is visible per-application
    via get_coi_declaration separately).
    """
    return (
        db.query(PSEvaluatorAssignment)
        .filter(PSEvaluatorAssignment.problem_statement_id == problem_statement_id)
        .all()
    )


def get_coi_declaration(
    db: Session, application_id: int, evaluator_id: int
) -> Optional[COIDeclaration]:
    """
    GET per-application COI status for an evaluator. Returns None if no
    declaration exists (evaluator hasn't declared yet, or wrong application/evaluator).
    """
    return (
        db.query(COIDeclaration)
        .filter(
            COIDeclaration.application_id == application_id,
            COIDeclaration.evaluator_id == evaluator_id,
        )
        .first()
    )


def get_coi_declarations_for_application(
    db: Session, application_id: int
) -> list[COIDeclaration]:
    """Get all COI declarations for an application (across all evaluators)."""
    return (
        db.query(COIDeclaration)
        .filter(COIDeclaration.application_id == application_id)
        .all()
    )


def get_unrecused_evaluator_ids(db: Session, application_id: int, ps_id: int) -> set[int]:
    """
    Helper for scoring_service.get_scoring_completeness (and similar):
    Returns the set of evaluator_ids assigned to this PS MINUS those recused
    on this specific application (Q4 locked ordering + judgment call #5).

    Used to determine which evaluators must submit complete scores for this application.
    """
    assigned_evaluator_ids = {
        row[0]
        for row in (
            db.query(PSEvaluatorAssignment.evaluator_id)
            .filter(PSEvaluatorAssignment.problem_statement_id == ps_id)
            .all()
        )
    }

    recused_evaluator_ids = {
        row[0]
        for row in (
            db.query(COIDeclaration.evaluator_id)
            .filter(
                COIDeclaration.application_id == application_id,
                COIDeclaration.recused == True,  # noqa: E712
            )
            .all()
        )
    }

    return assigned_evaluator_ids - recused_evaluator_ids