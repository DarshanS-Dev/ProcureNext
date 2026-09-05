"""
app/services/qcbs_service.py

Layer 4, Stage 4 — Commercial Gate + QCBS Computation (Doc B Stage 4, PRD §7.3/§16).

Owns:
- The one side-effecting write in this stage: auto-setting
  ProblemStatement.commercial_unlocked_at once every under_evaluation
  application in a PS satisfies Stage 3 completeness (Doc B Stage 4 #1).
  Everything else in this file is pure query-time computation — there is
  no QCBS table in the schema (PRD §16 note: "no table — fully derived at
  query time").
- Technical score aggregation (mean of each evaluator's weighted rubric
  total, Doc B Stage 4 #3).
- Commercial score computation (lowest-bid-normalized, PRD §7.3).
- final_score = 0.70*technical + 0.30*commercial — fixed, never stored,
  never admin-configurable (Doc B Stage 4 #4).
- Per-application QCBS score read, and PS-wide ranked view.

Judgment calls flagged inline (no schema/PRD line to point to):

1. `commercial_proposal` is untyped JSON on Application (models.py). Doc B/
   PRD never specify the exact key holding the bid amount. Locking the
   convention here: `commercial_proposal["bid_amount"]`, a numeric value.
   If Layer 3's actual submission schema uses a different key, this is the
   one spot to update. Missing/malformed bid data raises rather than
   silently defaulting to some score — a QCBS ranking with a silently
   wrong commercial score is worse than an explicit error surfaced to the
   officer.

2. Applicant scope for ranking/QCBS: which Applications under a PS are
   "QCBS-eligible" for scoring/ranking purposes? Chosen definition:
   status in {under_evaluation, selected, contracted, completed}, OR
   status == not_selected AND at least one EvaluationScore row exists for
   it (a proxy for "this application reached Stage 3 scoring before losing
   at QCBS," as distinct from a not_selected application that never left
   eligibility review — Doc B L3 #6's overloaded not_selected state means
   status alone can't disambiguate). Applications still at applied/
   under_review, or not_selected with zero EvaluationScore rows (i.e.
   filtered out at eligibility, never reached Stage 3), are excluded from
   both technical scoring and the commercial-bid pool. Confirm this
   filter is right if the ranking view ever looks empty/wrong.

3. `maybe_unlock_commercial_envelope` requires AT LEAST ONE qualifying
   (under_evaluation) application to exist for the PS before it will set
   commercial_unlocked_at — guards against the vacuous-truth bug where a
   PS with zero under_evaluation applications (e.g. every applicant
   filtered out at eligibility, or none have applied yet) would otherwise
   satisfy "every under_evaluation application is complete" trivially and
   unlock immediately with nothing to rank. Not explicitly stated in
   Doc B Stage 4 #1, but treated as an obvious edge-case fix, not a
   contract change.

4. This function does NOT auto-run scans across all PSs — it is called
   reactively, from scoring_service.submit_scores's flagged SEAM, with a
   specific problem_statement_id, right after a score submission that
   might have completed the last outstanding evaluator/application. No
   background job/cron is modeled (matches Doc B Stage 4 #1's "known
   limitation: a PS can stall indefinitely if one evaluator never scores
   — accepted for MVP, not solved").
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Application,
    ApplicationStatusEnum,
    COIDeclaration,
    EvaluationScore,
    ProblemStatement,
    RubricCriterion,
)
from app.services import audit_log_service, scoring_service

# Applications in these statuses are eligible to be scored/ranked outright.
_RANKABLE_STATUSES = {
    ApplicationStatusEnum.under_evaluation,
    ApplicationStatusEnum.selected,
    ApplicationStatusEnum.contracted,
    ApplicationStatusEnum.completed,
}

# JUDGMENT CALL #1: locked convention for where the bid amount lives inside
# the untyped commercial_proposal JSON blob.
_BID_AMOUNT_KEY = "bid_amount"


# ============================================================
# Errors
# ============================================================

class QCBSServiceError(Exception):
    """Base error for qcbs_service — routers translate to HTTP."""


class ProblemStatementNotFoundError(QCBSServiceError):
    pass


class ApplicationNotFoundError(QCBSServiceError):
    pass


class MissingBidError(QCBSServiceError):
    """Raised when an application's commercial_proposal is missing or
    malformed for the locked bid_amount convention (judgment call #1)."""


class NoRankableApplicationsError(QCBSServiceError):
    """Raised when a PS has no applications eligible for ranking yet."""


# ============================================================
# Applicant-scope helper (judgment call #2)
# ============================================================

def _get_rankable_applications(db: Session, problem_statement_id: int) -> list[Application]:
    applications = (
        db.query(Application)
        .filter(Application.problem_statement_id == problem_statement_id)
        .all()
    )

    rankable = []
    for application in applications:
        if application.status in _RANKABLE_STATUSES:
            rankable.append(application)
        elif application.status == ApplicationStatusEnum.not_selected:
            has_scores = (
                db.query(EvaluationScore)
                .filter(EvaluationScore.application_id == application.id)
                .first()
                is not None
            )
            if has_scores:
                rankable.append(application)
    return rankable


# ============================================================
# Commercial gate auto-unlock (Doc B Stage 4 #1)
# ============================================================

def maybe_unlock_commercial_envelope(db: Session, problem_statement_id: int) -> bool:
    """
    Checks whether every under_evaluation Application for this PS now
    satisfies Stage 3 completeness, and if so (and not already unlocked),
    sets ProblemStatement.commercial_unlocked_at = now and commits.

    Returns True if this call performed the unlock, False otherwise
    (already unlocked, not yet all-complete, or no qualifying applications
    — judgment call #3).

    Called reactively from scoring_service.submit_scores's SEAM. No manual
    override endpoint exists (Doc B Stage 4 #1) — this is the only write
    path to commercial_unlocked_at.
    """
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    if ps is None:
        raise ProblemStatementNotFoundError(f"ProblemStatement {problem_statement_id} not found")

    if ps.commercial_unlocked_at is not None:
        return False  # already unlocked, nothing to do

    under_evaluation_applications = (
        db.query(Application)
        .filter(
            Application.problem_statement_id == problem_statement_id,
            Application.status == ApplicationStatusEnum.under_evaluation,
        )
        .all()
    )

    # JUDGMENT CALL #3: guard against vacuous unlock when there's nothing
    # to actually be "complete."
    if not under_evaluation_applications:
        return False

    for application in under_evaluation_applications:
        completeness = scoring_service.get_scoring_completeness(db, application.id)
        if not completeness["complete"]:
            return False

    ps.commercial_unlocked_at = datetime.now(timezone.utc)

    audit_log_service.write_audit_log(
        db,
        actor_id=None,  # system-triggered
        action="commercial_envelope_unlocked",
        entity_type="ProblemStatement",
        entity_id=ps.id,
        metadata={
            "under_evaluation_application_ids": [a.id for a in under_evaluation_applications]
        },
    )

    db.commit()
    return True


# ============================================================
# Technical score aggregation (Doc B Stage 4 #3)
# ============================================================

def compute_technical_score(db: Session, application_id: int) -> float:
    """
    Per evaluator: evaluator_technical_score = Σ(criterion_score * weight/100)
    across their scored criteria. Across evaluators: MEAN of each
    evaluator's weighted total (chosen over median for explainability,
    Doc B Stage 4 #3).

    Recused evaluators (COIDeclaration.recused=True on this application)
    are excluded — mirrors scoring_service's completeness logic; a
    recused evaluator should never have submitted scores in the first
    place (blocked at submit_scores), but excluded defensively here too.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

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

    criteria_by_id = {c.id: c for c in db.query(RubricCriterion).all()}

    scores = (
        db.query(EvaluationScore)
        .filter(EvaluationScore.application_id == application_id)
        .all()
    )

    scores_by_evaluator: dict[int, list[EvaluationScore]] = {}
    for score in scores:
        if score.evaluator_id in recused_evaluator_ids:
            continue
        scores_by_evaluator.setdefault(score.evaluator_id, []).append(score)

    if not scores_by_evaluator:
        return 0.0

    evaluator_totals = []
    for evaluator_id, evaluator_scores in scores_by_evaluator.items():
        weighted_sum = 0.0
        for score in evaluator_scores:
            criterion = criteria_by_id.get(score.criterion_id)
            if criterion is None:
                continue
            weighted_sum += float(score.score) * (float(criterion.weight) / 100.0)
        evaluator_totals.append(weighted_sum)

    return sum(evaluator_totals) / len(evaluator_totals)


# ============================================================
# Commercial score (PRD §7.3)
# ============================================================

def _extract_bid_amount(application: Application) -> float:
    proposal = application.commercial_proposal or {}
    bid = proposal.get(_BID_AMOUNT_KEY)
    if bid is None:
        raise MissingBidError(
            f"Application {application.id} has no '{_BID_AMOUNT_KEY}' in commercial_proposal"
        )
    try:
        return float(bid)
    except (TypeError, ValueError):
        raise MissingBidError(
            f"Application {application.id} has a non-numeric '{_BID_AMOUNT_KEY}': {bid!r}"
        )


def compute_commercial_score(db: Session, application_id: int) -> float:
    """
    commercial_score = (lowest_bid_among_applicants / this_applicant's_bid) * 100.
    The lowest bidder in the PS gets 100; all others scaled proportionally
    (PRD §7.3). "Applicants" = the same rankable pool as
    _get_rankable_applications (judgment call #2) — a bid comparison against
    applications that never reached Stage 3 would be meaningless.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    rankable = _get_rankable_applications(db, application.problem_statement_id)
    if application not in rankable:
        rankable = rankable + [application]

    bids = [_extract_bid_amount(a) for a in rankable]
    lowest_bid = min(bids)
    this_bid = _extract_bid_amount(application)

    return (lowest_bid / this_bid) * 100.0


# ============================================================
# Combined QCBS score (Doc B Stage 4 #4)
# ============================================================

def get_qcbs_score(db: Session, application_id: int) -> dict:
    """
    GET /applications/{id}/qcbs-score — officer-owner/admin.

    final_score = 0.70 * technical_score + 0.30 * commercial_score — fixed,
    computed at query time, never stored, never admin-configurable
    (Doc B Stage 4 #4). Returns a dict matching QCBSScoreRead.
    """
    technical_score = compute_technical_score(db, application_id)
    commercial_score = compute_commercial_score(db, application_id)
    final_score = (0.70 * technical_score) + (0.30 * commercial_score)

    return {
        "application_id": application_id,
        "technical_score": technical_score,
        "commercial_score": commercial_score,
        "final_score": final_score,
    }


# ============================================================
# PS-wide ranking
# ============================================================

def get_qcbs_ranking(db: Session, problem_statement_id: int) -> dict:
    """
    GET /problem-statements/{id}/qcbs-ranking — officer-owner/admin.

    Computes get_qcbs_score for every rankable Application under the PS
    (judgment call #2), sorts descending by final_score, assigns rank
    (1 = highest). Returns a dict matching QCBSRankingRead.
    """
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    if ps is None:
        raise ProblemStatementNotFoundError(f"ProblemStatement {problem_statement_id} not found")

    rankable = _get_rankable_applications(db, problem_statement_id)
    if not rankable:
        raise NoRankableApplicationsError(
            f"No rankable applications exist yet for ProblemStatement {problem_statement_id}"
        )

    entries = []
    for application in rankable:
        qcbs = get_qcbs_score(db, application.id)
        entries.append(
            {
                "application_id": application.id,
                "startup_id": application.startup_id,
                "technical_score": qcbs["technical_score"],
                "commercial_score": qcbs["commercial_score"],
                "final_score": qcbs["final_score"],
            }
        )

    entries.sort(key=lambda e: e["final_score"], reverse=True)
    for rank, entry in enumerate(entries, start=1):
        entry["rank"] = rank

    return {
        "problem_statement_id": problem_statement_id,
        "rankings": entries,
    }