"""
app/services/scoring_service.py

Layer 4, Stage 3 — Technical Evaluation Scoring (Doc B Stage 3, PRD §7.2/§16).

Owns:
- Read access to the 7 seeded platform-wide RubricCriterion rows.
- Evaluator score submission, gated by the mandatory-blocking COI
  declaration (Doc B Stage 2 #4).
- Read access to EvaluationScore rows for an application.
- Live scoring-completeness computation (Doc B Stage 3 #3) — no stored
  boolean, computed at query time.

Judgment calls flagged inline (no schema/PRD line to point to):

1. RubricCriterion seeding (the 7 platform-wide rows themselves) is NOT
   done by this service. Doc B Stage 3 #1 says these are "seeded once" —
   read as a one-time DB seed/migration concern, not a runtime function
   evaluators or officers ever call. `get_rubric_criteria` only reads
   whatever rows already exist. If no seed script exists yet, that's a
   separate small task (Alembic data migration or a seed script under
   e.g. scripts/seed_rubric.py) — flagging so it isn't forgotten, not
   solving it here.

2. Score submission is INSERT-ONLY, one-shot per (application, evaluator,
   criterion) — matches the DB's own UniqueConstraint
   (application_id, evaluator_id, criterion_id). Doc B Stage 3 doesn't
   say whether an evaluator may revise a previously-submitted score.
   Given technical scoring feeds directly into QCBS ranking + Compliance
   Record (defensibility framing, PRD §1.1), silently allowing revision
   post-submission would undermine the "every score is justified and
   locked" audit story. Chose to reject any resubmission attempt for a
   criterion the evaluator already scored on this application, rather
   than silently upserting. If revision turns out to be wanted, this is
   the one function to change (raise -> update-in-place).

3. Partial submission across multiple calls is ALLOWED — an evaluator can
   POST some criteria now and the rest later (each call is validated
   independently per criterion_id against the existing row set for that
   evaluator+application). Doc B doesn't require all 7 to arrive in a
   single POST, and `EvaluationScoreCreate` in core_schemas.py just wraps
   a list without saying it must be length-7. Completeness is what
   ultimately requires all 7 (Stage 3 #3) — submission itself doesn't
   need to be atomic-all-or-nothing across criteria. Each valid row in
   the batch is committed together as one transaction; if ANY row in the
   batch fails validation (duplicate criterion, COI-blocked, unknown
   criterion_id), the WHOLE batch is rejected before any row is added —
   avoids partial-batch inserts that would be confusing to the evaluator
   ("did my first 3 scores save or not?").

4. SEAM: Doc B Stage 4 #1 says `commercial_unlocked_at` is set
   automatically the instant every `under_evaluation` application in a PS
   satisfies Stage 3 completeness — a PS-WIDE check across all of that
   PS's applications, not just the one an evaluator just finished scoring.
   That check naturally belongs in `qcbs_service.py` (Stage 4's owner,
   not yet built), but the natural trigger point is "an evaluator just
   submitted scores that made THIS application newly complete" — which
   happens here. Rather than wiring a call to a service that doesn't
   exist yet, this is left as an explicit `# SEAM:` marker below (same
   pattern as application_service.py's preliminary-RiskProfile seam) so
   it isn't silently forgotten when qcbs_service.py is written.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Application,
    COIDeclaration,
    EvaluationScore,
    ProblemStatement,
    PSEvaluatorAssignment,
    RubricCriterion,
)
from app.services import audit_log_service


# ============================================================
# Errors
# ============================================================

class ScoringServiceError(Exception):
    """Base error for scoring_service — routers translate to HTTP."""


class ApplicationNotFoundError(ScoringServiceError):
    pass


class COIGateBlockedError(ScoringServiceError):
    """Raised when the evaluator has no COIDeclaration on file, or is recused."""


class UnknownCriterionError(ScoringServiceError):
    pass


class DuplicateScoreError(ScoringServiceError):
    """Raised when the evaluator has already scored this criterion for this
    application — resubmission/revision is not supported (see judgment call #2)."""


# ============================================================
# Rubric reads
# ============================================================

def get_rubric_criteria(db: Session) -> list[RubricCriterion]:
    """
    GET /rubric-criteria — any authenticated. Returns whatever
    RubricCriterion rows exist (expected: the 7 seeded platform-wide rows,
    category=null, per Doc B Stage 3 #1). Seeding itself is not this
    function's responsibility — see judgment call #1.
    """
    return db.query(RubricCriterion).all()


# ============================================================
# Score submission
# ============================================================

def submit_scores(
    db: Session,
    application_id: int,
    evaluator_id: int,
    scores: list[dict],
) -> list[EvaluationScore]:
    """
    POST /applications/{id}/scores — evaluator-assigned, non-recused.

    `scores` is a list of {criterion_id, score, justification} dicts
    (mirrors EvaluationScoreEntry). Validates the whole batch before
    inserting anything (judgment call #3 — all-or-nothing per call,
    though separate calls over time may each add more criteria).

    Gates enforced, in order:
      1. Application must exist.
      2. COI gate (Doc B Stage 2 #4): evaluator must have a
         COIDeclaration row for this application with recused=False.
         No declaration at all, or declared_conflict/recused=True, both
         block scoring.
      3. Every criterion_id in the batch must reference a real
         RubricCriterion row.
      4. No criterion_id in the batch may already have an EvaluationScore
         row for this (application_id, evaluator_id) pair — insert-only,
         no revision (judgment call #2).
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    coi = (
        db.query(COIDeclaration)
        .filter(
            COIDeclaration.application_id == application_id,
            COIDeclaration.evaluator_id == evaluator_id,
        )
        .first()
    )
    if coi is None or coi.recused:
        raise COIGateBlockedError(
            f"Evaluator {evaluator_id} cannot score application {application_id}: "
            f"{'no COIDeclaration on file' if coi is None else 'evaluator is recused'}"
        )

    requested_criterion_ids = {entry["criterion_id"] for entry in scores}
    existing_criteria = (
        db.query(RubricCriterion)
        .filter(RubricCriterion.id.in_(requested_criterion_ids))
        .all()
    )
    known_criterion_ids = {c.id for c in existing_criteria}
    unknown = requested_criterion_ids - known_criterion_ids
    if unknown:
        raise UnknownCriterionError(f"Unknown criterion_id(s): {sorted(unknown)}")

    already_scored = (
        db.query(EvaluationScore.criterion_id)
        .filter(
            EvaluationScore.application_id == application_id,
            EvaluationScore.evaluator_id == evaluator_id,
            EvaluationScore.criterion_id.in_(requested_criterion_ids),
        )
        .all()
    )
    already_scored_ids = {row[0] for row in already_scored}
    if already_scored_ids:
        raise DuplicateScoreError(
            f"Evaluator {evaluator_id} has already scored criterion_id(s) "
            f"{sorted(already_scored_ids)} for application {application_id} "
            f"— revision is not supported"
        )

    created_rows: list[EvaluationScore] = []
    for entry in scores:
        row = EvaluationScore(
            application_id=application_id,
            evaluator_id=evaluator_id,
            criterion_id=entry["criterion_id"],
            score=entry["score"],
            justification=entry["justification"],
        )
        db.add(row)
        created_rows.append(row)

    db.flush()

    audit_log_service.write_audit_log(
        db,
        actor_id=evaluator_id,
        action="scores_recorded",
        entity_type="Application",
        entity_id=application_id,
        metadata={"criterion_ids": sorted(requested_criterion_ids)},
    )

    db.commit()

    # Now that qcbs_service.py exists: check whether this submission just
    # made every under_evaluation application in this PS Stage-3-complete,
    # in which case commercial_unlocked_at should be set automatically
    # (Doc B Stage 4 #1). Called post-commit, as its own follow-up
    # transaction — it does its own completeness re-check + commit, so it
    # doesn't need to share this function's transaction boundary.
    from app.services import qcbs_service  # local import: avoids a circular
    # import at module load time (qcbs_service imports scoring_service).
    qcbs_service.maybe_unlock_commercial_envelope(db, application.problem_statement_id)

    for row in created_rows:
        db.refresh(row)
    return created_rows


# ============================================================
# Reads
# ============================================================

def get_scores_for_application(db: Session, application_id: int) -> list[EvaluationScore]:
    """GET /applications/{id}/scores — officer/admin/evaluator-assigned."""
    return (
        db.query(EvaluationScore)
        .filter(EvaluationScore.application_id == application_id)
        .all()
    )


def get_scoring_completeness(db: Session, application_id: int) -> dict:
    """
    GET /applications/{id}/scores/completeness — officer/admin.

    Doc B Stage 3 #3: complete = every PSEvaluatorAssignment for this
    application's PS, MINUS anyone recused=True specifically on this
    application, has submitted EvaluationScore rows for all 7 criteria.
    Computed live — no stored boolean.

    Returns {"complete": bool, "pending_evaluator_ids": [...]} matching
    ScoreCompletenessRead.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    total_criteria_count = db.query(RubricCriterion).count()

    assigned_evaluator_ids = {
        row[0]
        for row in (
            db.query(PSEvaluatorAssignment.evaluator_id)
            .filter(
                PSEvaluatorAssignment.problem_statement_id
                == application.problem_statement_id
            )
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

    active_evaluator_ids = assigned_evaluator_ids - recused_evaluator_ids

    pending_evaluator_ids = []
    for evaluator_id in active_evaluator_ids:
        submitted_count = (
            db.query(EvaluationScore)
            .filter(
                EvaluationScore.application_id == application_id,
                EvaluationScore.evaluator_id == evaluator_id,
            )
            .count()
        )
        if submitted_count < total_criteria_count:
            pending_evaluator_ids.append(evaluator_id)

    return {
        "complete": len(pending_evaluator_ids) == 0,
        "pending_evaluator_ids": sorted(pending_evaluator_ids),
    }