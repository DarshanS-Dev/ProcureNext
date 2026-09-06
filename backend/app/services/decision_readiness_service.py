"""
app/services/decision_readiness_service.py

Layer 4, Stage 6 — Decision Readiness Gate (Doc B Stage 6, PRD §7.4/§16).

Owns:
- The live, query-time-only Decision Readiness check (Doc B Stage 6 #1) — never
  cached, computed fresh on every call, per PRD §16's "Key Design Decisions Baked
  In" note.
- The server-side enforcement hook used by application_service.create_selection_decision
  (not yet written elsewhere — see note below) via `assert_decision_ready`.

Six checks, all locked verbatim from Doc B Stage 6 #1:
    1. eligibility = eligible
    2. Stage 3 (technical scoring) completeness
    3. no unresolved COI blocking
    4. commercial_unlocked_at is set
    5. final RiskProfile exists
    6. ContainmentPlan exists

`overall_ready` = all six True. No partial-credit, no override path (Doc B Stage
6 #2 — POST /applications/{id}/select rejects with 400 if any check fails).

This file does NOT create the SelectionDecision row itself — Doc B Stage 6 #2-4
puts `POST /applications/{id}/select` under Layer 3's existing endpoint list
(already scaffolded in application_service.py's docstring as a TODO route, not
yet implemented as of this session). `assert_decision_ready` is the hook that
endpoint should call before inserting a SelectionDecision row; wiring the actual
insert + the "only one SelectionDecision per problem_statement_id" service-layer
check (Doc B Stage 6 #4) is left for whoever writes that endpoint/service
function next — flagged here rather than silently duplicated into this file,
since SelectionDecision creation is Layer 3's table, not Stage 6's.

Judgment calls flagged inline (no schema/PRD line to point to):

1. Check #3 ("no unresolved COI blocking") — Doc B Stage 6 #1 doesn't define
   "unresolved" precisely. Read as: every PSEvaluatorAssignment for this PS that
   is NOT recused on this specific application must have filed A COIDeclaration
   row at all (declared_conflict True or False, doesn't matter which — filing
   is what "resolved" means; a still-required-but-never-filed declaration is
   what blocks). This mirrors scoring_service's own COI gate at the individual-
   evaluator level (no COIDeclaration on file blocks scoring) rather than
   inventing a new definition — if an evaluator's scores already exist (Stage 3
   completeness is check #2, computed separately), they necessarily already
   filed COI (scoring_service.submit_scores requires it), so in practice check
   #2 passing already implies check #3 passing for anyone who scored. This
   check exists as a defensive independent gate mainly for the edge case of an
   assignment with zero scores and zero COI filed sitting stale — confirm this
   reading if COI semantics are ever revisited.

2. Uses `evaluator_service.get_unrecused_evaluator_ids` (existing helper) for
   both check #2's completeness inputs (via scoring_service, already built that
   way) and check #3's COI-filed inputs — keeping the "who counts as an active
   evaluator for this application" definition in exactly one place rather than
   re-deriving it here.
"""

from sqlalchemy.orm import Session

from app.models import (
    Application,
    COIDeclaration,
    ContainmentPlan,
    EligibilityCheck,
    OverallEligibilityEnum,
    ProblemStatement,
    RiskProfile,
    RiskStageEnum,
)
from app.services import evaluator_service, scoring_service


# ============================================================
# Errors
# ============================================================

class DecisionReadinessServiceError(Exception):
    """Base error for decision_readiness_service — routers translate to HTTP."""


class ApplicationNotFoundError(DecisionReadinessServiceError):
    pass


class NotDecisionReadyError(DecisionReadinessServiceError):
    """Raised by assert_decision_ready when any of the six checks fails.
    Carries the full readiness dict so the caller/router can report exactly
    which check(s) blocked selection."""

    def __init__(self, readiness: dict):
        self.readiness = readiness
        failed = [k for k, v in readiness.items() if k != "overall_ready" and not v]
        super().__init__(f"Decision Readiness failed: {failed}")


# ============================================================
# Individual checks
# ============================================================

def _check_eligibility(db: Session, application_id: int) -> bool:
    """Check #1: EligibilityCheck.overall_result = eligible."""
    eligibility_check = (
        db.query(EligibilityCheck)
        .filter(EligibilityCheck.application_id == application_id)
        .first()
    )
    return (
        eligibility_check is not None
        and eligibility_check.overall_result == OverallEligibilityEnum.eligible
    )


def _check_stage3_complete(db: Session, application_id: int) -> bool:
    """Check #2: delegates to scoring_service's own live completeness computation
    (Doc B Stage 3 #3) — not re-derived here."""
    completeness = scoring_service.get_scoring_completeness(db, application_id)
    return completeness["complete"]


def _check_no_unresolved_coi(db: Session, application, ps_id: int) -> bool:
    """Check #3: every active (non-recused-on-this-application) assigned
    evaluator must have filed A COIDeclaration row (judgment call #1/#2)."""
    active_evaluator_ids = evaluator_service.get_unrecused_evaluator_ids(
        db, application_id=application.id, ps_id=ps_id
    )
    if not active_evaluator_ids:
        return True  # zero active evaluators -> vacuously nothing unresolved

    filed_evaluator_ids = {
        row[0]
        for row in (
            db.query(COIDeclaration.evaluator_id)
            .filter(
                COIDeclaration.application_id == application.id,
                COIDeclaration.evaluator_id.in_(active_evaluator_ids),
            )
            .all()
        )
    }
    return active_evaluator_ids.issubset(filed_evaluator_ids)


def _check_commercial_unlocked(ps: ProblemStatement) -> bool:
    """Check #4: ProblemStatement.commercial_unlocked_at is set."""
    return ps.commercial_unlocked_at is not None


def _check_final_risk_profile_exists(db: Session, application_id: int) -> bool:
    """Check #5: a stage=final RiskProfile row exists for this application."""
    return (
        db.query(RiskProfile)
        .filter(
            RiskProfile.application_id == application_id,
            RiskProfile.stage == RiskStageEnum.final,
        )
        .first()
        is not None
    )


def _check_containment_plan_exists(db: Session, application_id: int) -> bool:
    """Check #6: a ContainmentPlan row exists for this application."""
    return (
        db.query(ContainmentPlan)
        .filter(ContainmentPlan.application_id == application_id)
        .first()
        is not None
    )


# ============================================================
# Combined readiness (GET /applications/{id}/decision-readiness)
# ============================================================

def get_decision_readiness(db: Session, application_id: int) -> dict:
    """
    GET /applications/{id}/decision-readiness — officer-owner/admin.

    Computed live on every call (Doc B Stage 6 #1, PRD §16 — "never cached").
    Returns a dict matching DecisionReadinessRead exactly.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    ps = (
        db.query(ProblemStatement)
        .filter(ProblemStatement.id == application.problem_statement_id)
        .first()
    )
    if ps is None:
        raise ApplicationNotFoundError(
            f"ProblemStatement {application.problem_statement_id} not found "
            f"for application {application_id}"
        )

    eligibility_passed = _check_eligibility(db, application_id)
    stage3_scoring_complete = _check_stage3_complete(db, application_id)
    no_unresolved_coi = _check_no_unresolved_coi(db, application, ps.id)
    commercial_unlocked = _check_commercial_unlocked(ps)
    final_risk_profile_exists = _check_final_risk_profile_exists(db, application_id)
    containment_plan_exists = _check_containment_plan_exists(db, application_id)

    overall_ready = all(
        [
            eligibility_passed,
            stage3_scoring_complete,
            no_unresolved_coi,
            commercial_unlocked,
            final_risk_profile_exists,
            containment_plan_exists,
        ]
    )

    return {
        "application_id": application_id,
        "eligibility_passed": eligibility_passed,
        "stage3_scoring_complete": stage3_scoring_complete,
        "no_unresolved_coi": no_unresolved_coi,
        "commercial_unlocked": commercial_unlocked,
        "final_risk_profile_exists": final_risk_profile_exists,
        "containment_plan_exists": containment_plan_exists,
        "overall_ready": overall_ready,
    }


# ============================================================
# Enforcement hook (Doc B Stage 6 #2) — for POST /applications/{id}/select
# ============================================================

def assert_decision_ready(db: Session, application_id: int) -> dict:
    """
    Server-side enforcement per Doc B Stage 6 #2: reject with 400 if any check
    fails. Call this from the (not-yet-written) selection service function
    before inserting a SelectionDecision row — see module docstring note on
    why SelectionDecision creation itself doesn't live in this file.

    Raises NotDecisionReadyError (carrying the full readiness dict) if
    overall_ready is False. Returns the readiness dict on success so the caller
    doesn't need to recompute it.
    """
    readiness = get_decision_readiness(db, application_id)
    if not readiness["overall_ready"]:
        raise NotDecisionReadyError(readiness)
    return readiness