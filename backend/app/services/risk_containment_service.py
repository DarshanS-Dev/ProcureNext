"""
app/services/risk_containment_service.py

Layer 4, Stage 5 — Risk Profile + Containment Plan (Doc B Stage 5, PRD §08/§16).

Owns:
- Preliminary RiskProfile auto-computation (fires on EligibilityCheck.overall_result
  = eligible — same trigger as Stage 2 opening).
- Final RiskProfile auto-computation (fires on ProblemStatement.commercial_unlocked_at
  being set — technical scoring guaranteed complete by then, per Doc B Stage 4 #1,
  so Cybersecurity risk always has full Security & compliance data).
- ContainmentPlan CRUD: AI-assist draft (plain conditional templating — no LLM,
  see below) + officer-submitted final values.

All six risk category formulas below were locked in the Risk/Containment brainstorm
session, specifically BECAUSE the naive PRD wording ("TRL + past deployments",
"budget vs funding_band ratio", "headcount vs scope ratio", "architecture keyword
matching") turned out to require either fields that don't exist (`scope`) or division
between two things that aren't numbers ("seed" / "₹10 lakh"). The fix in every case
is the same shape: turn the free-text field into a fixed dropdown (done in models.py
this session — see StartupProfile.trl_stage/funding_band/architecture and
ProblemStatement.budget_range), then score via a lookup table instead of a formula.

Universal thresholds (Doc B Stage 5 #5, locked, do not touch here):
    score >= 70  -> LOW
    40 <= score < 70 -> MEDIUM
    score < 40   -> HIGH

overall_risk = worst (highest-severity) of the six category scores (Doc B Stage 5 #6).

Judgment calls flagged inline (no schema/PRD line to point to — beyond the locked
lookup tables themselves, which came from the brainstorm and are treated as final):

1. `trl_stage` is now a plain Integer (1-9), not an Enum (see models.py comment) —
   TRL is a real ordinal numeric standard, an Enum of 9 near-identical single-value
   members would add nothing an int range-check doesn't already give us. This
   function validates the 1-9 range defensively (treats out-of-range/None as the
   lowest bucket) rather than raising, since a startup mid-registration may not
   have set it yet and preliminary RiskProfile can still fire on partial data.

2. `compute_technical_risk` reads `past_deployments` as a JSON list and only uses
   its LENGTH (bucketed 0 / 1-2 / 3+) — per the brainstorm's own framing
   ("more past deployments = lower risk, since they've done it before"), not
   attempting to parse structure out of individual list entries (no guaranteed
   shape exists on that JSON blob).

3. `compute_scalability_risk` treats `architecture` as a JSON list of
   ArchitectureTagEnum string values (per the new checkbox-based field). Unknown/
   stray strings in the list (e.g. if older free-text data lingers pre-migration)
   are silently ignored rather than raising — defensive, since no migration has
   been run yet and this field's shape is brand new.

4. Missing/None inputs (trl_stage never set, architecture empty list, funding_band
   unset, etc.) are NOT treated as errors — they fall into the most conservative
   (safest-assumption, i.e. HIGHEST risk / lowest score) bucket of whichever table
   they belong to. Rationale: a RiskProfile is meant to surface caution to the
   Officer; silently defaulting to a falsely reassuring LOW risk on missing data
   would be the wrong failure mode. Confirm this default-to-caution choice if it
   ever produces confusing preliminary profiles for barely-registered startups.

5. `create_or_update_containment_plan` allows resubmission (upsert), not insert-
   only — Doc B Stage 5 #7 says ContainmentPlan is "filled in any time after final
   RiskProfile exists," which reads as officer-editable-until-satisfied rather
   than a one-shot lock, unlike e.g. scoring_service's insert-only EvaluationScore
   pattern. If a stricter one-shot-then-frozen rule is wanted, this is the one
   function to change.

6. ContainmentPlan AI-assist (`containment_plan_ai_assist`) is written directly
   here as plain conditional string templates, NOT as an unimplemented seam for
   Teammate B. Confirmed this session: every field it drafts (`max_scope`,
   `fallback_process`, `data_terms`, `exit_conditions`) is derived purely from
   already-structured PS fields (category enum, sensitivity_flags, budget_range
   enum, success_condition/target strings) via fixed templates — no free-text
   interpretation or novel generation, unlike problem_statement_service's
   `ai_assist_draft()` which genuinely needs an LLM to parse arbitrary rough_text.
   `budget_description` (new free-text field) is deliberately NOT read here —
   confirmed this session that richer free-text-driven drafting is a future
   version's feature once budget captures real narrative detail again; for now
   AI-assist stays keyed off the fixed enum only, consistent with "advisory only,
   officer edits every field before submit" (Doc B Stage 5 #8 / PRD §14).
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Application,
    ArchitectureTagEnum,
    BudgetRangeEnum,
    COIDeclaration,
    ContainmentPlan,
    EvaluationScore,
    FundingBandEnum,
    ProblemStatement,
    RiskLevelEnum,
    RiskProfile,
    RiskStageEnum,
    RubricCriterion,
    StartupProfile,
)
from app.services import audit_log_service


# ============================================================
# Errors
# ============================================================

class RiskContainmentServiceError(Exception):
    """Base error for risk_containment_service — routers translate to HTTP."""


class ApplicationNotFoundError(RiskContainmentServiceError):
    pass


class StartupProfileNotFoundError(RiskContainmentServiceError):
    pass


class ProblemStatementNotFoundError(RiskContainmentServiceError):
    pass


class RiskProfileAlreadyExistsError(RiskContainmentServiceError):
    pass


class FinalRiskProfileMissingError(RiskContainmentServiceError):
    """Raised when ContainmentPlan creation is attempted before a final
    RiskProfile exists (Doc B Stage 5 #7)."""


# ============================================================
# Threshold helper (Doc B Stage 5 #5 — universal, locked)
# ============================================================

def _score_to_level(score: float) -> RiskLevelEnum:
    if score >= 70:
        return RiskLevelEnum.low
    if score >= 40:
        return RiskLevelEnum.medium
    return RiskLevelEnum.high


def _worst_level(levels: list[RiskLevelEnum]) -> RiskLevelEnum:
    """overall_risk = worst (highest-severity) of the six (Doc B Stage 5 #6)."""
    severity = {RiskLevelEnum.low: 0, RiskLevelEnum.medium: 1, RiskLevelEnum.high: 2}
    return max(levels, key=lambda lvl: severity[lvl])


# ============================================================
# Category formulas — each returns a raw 0-100 score
# ============================================================

# --- Technical Risk: TRL bucket score + past_deployments bonus (locked #1) ---

_TRL_BUCKET_SCORES = [
    (range(1, 4), 20),   # TRL 1-3 — early research
    (range(4, 7), 55),   # TRL 4-6 — prototype
    (range(7, 10), 85),  # TRL 7-9 — proven/deployed
]


def compute_technical_risk(profile: StartupProfile) -> float:
    trl = profile.trl_stage
    base = 20  # judgment call #4: missing/invalid TRL -> most conservative bucket
    if trl is not None:
        for trl_range, score in _TRL_BUCKET_SCORES:
            if trl in trl_range:
                base = score
                break

    deployment_count = len(profile.past_deployments or [])
    if deployment_count >= 3:
        bonus = 10
    elif deployment_count >= 1:
        bonus = 5
    else:
        bonus = 0

    return min(100, base + bonus)


# --- Financial Risk: FundingBand x BudgetRange lookup grid (locked #2) ---

_FINANCIAL_RISK_GRID: dict[FundingBandEnum, dict[BudgetRangeEnum, float]] = {
    FundingBandEnum.bootstrapped: {
        BudgetRangeEnum.under_5L: 80,
        BudgetRangeEnum.band_5L_to_25L: 55,
        BudgetRangeEnum.band_25L_to_1Cr: 30,
        BudgetRangeEnum.over_1Cr: 15,
    },
    FundingBandEnum.pre_seed: {
        BudgetRangeEnum.under_5L: 80,
        BudgetRangeEnum.band_5L_to_25L: 50,
        BudgetRangeEnum.band_25L_to_1Cr: 25,
        BudgetRangeEnum.over_1Cr: 10,
    },
    FundingBandEnum.seed: {
        BudgetRangeEnum.under_5L: 85,
        BudgetRangeEnum.band_5L_to_25L: 70,
        BudgetRangeEnum.band_25L_to_1Cr: 45,
        BudgetRangeEnum.over_1Cr: 20,
    },
    FundingBandEnum.series_a: {
        BudgetRangeEnum.under_5L: 90,
        BudgetRangeEnum.band_5L_to_25L: 80,
        BudgetRangeEnum.band_25L_to_1Cr: 65,
        BudgetRangeEnum.over_1Cr: 40,
    },
    FundingBandEnum.series_b_plus: {
        BudgetRangeEnum.under_5L: 95,
        BudgetRangeEnum.band_5L_to_25L: 90,
        BudgetRangeEnum.band_25L_to_1Cr: 80,
        BudgetRangeEnum.over_1Cr: 60,
    },
}

# judgment call #4: missing funding_band or budget_range -> most conservative cell
_FINANCIAL_RISK_FALLBACK = 15


def compute_financial_risk(profile: StartupProfile, ps: ProblemStatement) -> float:
    if profile.funding_band is None or ps.budget_range is None:
        return _FINANCIAL_RISK_FALLBACK
    return _FINANCIAL_RISK_GRID[profile.funding_band][ps.budget_range]


# --- Implementation Risk: headcount bucket x BudgetRange (scope proxy) (locked #3) ---

def _headcount_bucket(headcount: Optional[int]) -> str:
    if headcount is None:
        return "small"  # judgment call #4: unset -> most conservative bucket
    if headcount <= 10:
        return "small"
    if headcount <= 50:
        return "medium"
    return "large"


_IMPLEMENTATION_RISK_GRID: dict[str, dict[BudgetRangeEnum, float]] = {
    "small": {
        BudgetRangeEnum.under_5L: 85,
        BudgetRangeEnum.band_5L_to_25L: 60,
        BudgetRangeEnum.band_25L_to_1Cr: 35,
        BudgetRangeEnum.over_1Cr: 15,
    },
    "medium": {
        BudgetRangeEnum.under_5L: 90,
        BudgetRangeEnum.band_5L_to_25L: 80,
        BudgetRangeEnum.band_25L_to_1Cr: 60,
        BudgetRangeEnum.over_1Cr: 40,
    },
    "large": {
        BudgetRangeEnum.under_5L: 90,
        BudgetRangeEnum.band_5L_to_25L: 85,
        BudgetRangeEnum.band_25L_to_1Cr: 75,
        BudgetRangeEnum.over_1Cr: 55,
    },
}

_IMPLEMENTATION_RISK_FALLBACK = 15


def compute_implementation_risk(profile: StartupProfile, ps: ProblemStatement) -> float:
    if ps.budget_range is None:
        return _IMPLEMENTATION_RISK_FALLBACK
    bucket = _headcount_bucket(profile.team_headcount)
    return _IMPLEMENTATION_RISK_GRID[bucket][ps.budget_range]


# --- Cybersecurity Risk: Security & compliance rubric criterion, direct passthrough ---

_SECURITY_CRITERION_NAME = "Security & compliance"  # matches seeded RubricCriterion.name (§7.2)


def compute_cybersecurity_risk(db: Session, application_id: int) -> float:
    """
    Direct passthrough of the Security & compliance rubric criterion score,
    averaged across evaluators (Doc B Stage 5 #4) — already 0-100, no lookup
    table needed. Guaranteed complete by the time Final RiskProfile fires
    (commercial_unlocked_at implies Stage 3 completeness, Doc B Stage 4 #1).

    Recused evaluators (COIDeclaration.recused=True) excluded, mirroring
    qcbs_service.compute_technical_score's pattern.
    """
    criterion = (
        db.query(RubricCriterion)
        .filter(RubricCriterion.name == _SECURITY_CRITERION_NAME)
        .first()
    )
    if criterion is None:
        return _FINANCIAL_RISK_FALLBACK  # judgment call #4: no seeded criterion -> conservative

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

    scores = (
        db.query(EvaluationScore)
        .filter(
            EvaluationScore.application_id == application_id,
            EvaluationScore.criterion_id == criterion.id,
        )
        .all()
    )
    relevant_scores = [float(s.score) for s in scores if s.evaluator_id not in recused_evaluator_ids]

    if not relevant_scores:
        return _FINANCIAL_RISK_FALLBACK  # judgment call #4: no scores yet -> conservative

    return sum(relevant_scores) / len(relevant_scores)


# --- Data Risk: flat rule off sensitivity_flags (locked #5) ---

def compute_data_risk(ps: ProblemStatement) -> float:
    return 30.0 if (ps.sensitivity_flags or []) else 90.0


# --- Scalability Risk: architecture checkbox points + api_available (locked #4) ---

_ARCHITECTURE_POINTS: dict[ArchitectureTagEnum, int] = {
    ArchitectureTagEnum.cloud: 25,
    ArchitectureTagEnum.microservices: 20,
    ArchitectureTagEnum.api_first: 20,
    ArchitectureTagEnum.on_premise: -15,
    ArchitectureTagEnum.monolith: -15,
}


def compute_scalability_risk(profile: StartupProfile) -> float:
    score = 50  # base
    for tag in (profile.architecture or []):
        # judgment call #3: unknown/stray strings ignored defensively
        try:
            tag_enum = ArchitectureTagEnum(tag)
        except ValueError:
            continue
        score += _ARCHITECTURE_POINTS.get(tag_enum, 0)

    if profile.api_available:
        score += 15

    return max(0, min(100, score))


# ============================================================
# RiskProfile computation + persistence
# ============================================================

def _load_application_and_profile(db: Session, application_id: int) -> tuple[Application, StartupProfile, ProblemStatement]:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    profile = (
        db.query(StartupProfile)
        .filter(StartupProfile.user_id == application.startup_id)
        .first()
    )
    if profile is None:
        raise StartupProfileNotFoundError(
            f"No StartupProfile found for startup_id={application.startup_id}"
        )

    ps = (
        db.query(ProblemStatement)
        .filter(ProblemStatement.id == application.problem_statement_id)
        .first()
    )
    if ps is None:
        raise ProblemStatementNotFoundError(
            f"ProblemStatement {application.problem_statement_id} not found"
        )

    return application, profile, ps


def compute_preliminary_risk_profile(db: Session, application_id: int) -> RiskProfile:
    """
    Fires the moment EligibilityCheck.overall_result = eligible (Doc B Stage 5 #1)
    — same trigger as Stage 2 opening. Called from application_service's flagged
    SEAM. Cybersecurity risk will be conservative/fallback at this point (no
    scores exist yet) — that's expected, Final RiskProfile supersedes it later.

    Raises RiskProfileAlreadyExistsError if a preliminary row already exists for
    this application (should only ever be computed once per application).
    """
    existing = (
        db.query(RiskProfile)
        .filter(
            RiskProfile.application_id == application_id,
            RiskProfile.stage == RiskStageEnum.preliminary,
        )
        .first()
    )
    if existing is not None:
        raise RiskProfileAlreadyExistsError(
            f"Preliminary RiskProfile already exists for application {application_id}"
        )

    application, profile, ps = _load_application_and_profile(db, application_id)

    technical = compute_technical_risk(profile)
    financial = compute_financial_risk(profile, ps)
    implementation = compute_implementation_risk(profile, ps)
    cybersecurity = compute_cybersecurity_risk(db, application_id)  # conservative fallback pre-scoring
    data = compute_data_risk(ps)
    scalability = compute_scalability_risk(profile)

    levels = {
        "technical_risk": _score_to_level(technical),
        "financial_risk": _score_to_level(financial),
        "implementation_risk": _score_to_level(implementation),
        "cybersecurity_risk": _score_to_level(cybersecurity),
        "data_risk": _score_to_level(data),
        "scalability_risk": _score_to_level(scalability),
    }
    overall = _worst_level(list(levels.values()))

    risk_profile = RiskProfile(
        application_id=application_id,
        stage=RiskStageEnum.preliminary,
        overall_risk=overall,
        **levels,
    )
    db.add(risk_profile)
    db.flush()

    audit_log_service.write_audit_log(
        db,
        actor_id=None,  # system-triggered
        action="risk_profile_computed",
        entity_type="RiskProfile",
        entity_id=risk_profile.id,
        metadata={"stage": "preliminary", "overall_risk": overall.value},
    )

    db.commit()
    db.refresh(risk_profile)
    return risk_profile


def compute_final_risk_profile(db: Session, application_id: int) -> RiskProfile:
    """
    Fires the moment ProblemStatement.commercial_unlocked_at is set (Doc B Stage
    5 #2) — technical scoring guaranteed complete by then, so Cybersecurity risk
    has full Security & compliance data this time. Called from qcbs_service's
    maybe_unlock_commercial_envelope, once per newly-unlocked application (SEAM
    to be wired there — see that file).

    Raises RiskProfileAlreadyExistsError if a final row already exists.
    """
    existing = (
        db.query(RiskProfile)
        .filter(
            RiskProfile.application_id == application_id,
            RiskProfile.stage == RiskStageEnum.final,
        )
        .first()
    )
    if existing is not None:
        raise RiskProfileAlreadyExistsError(
            f"Final RiskProfile already exists for application {application_id}"
        )

    application, profile, ps = _load_application_and_profile(db, application_id)

    technical = compute_technical_risk(profile)
    financial = compute_financial_risk(profile, ps)
    implementation = compute_implementation_risk(profile, ps)
    cybersecurity = compute_cybersecurity_risk(db, application_id)  # real data now
    data = compute_data_risk(ps)
    scalability = compute_scalability_risk(profile)

    levels = {
        "technical_risk": _score_to_level(technical),
        "financial_risk": _score_to_level(financial),
        "implementation_risk": _score_to_level(implementation),
        "cybersecurity_risk": _score_to_level(cybersecurity),
        "data_risk": _score_to_level(data),
        "scalability_risk": _score_to_level(scalability),
    }
    overall = _worst_level(list(levels.values()))

    risk_profile = RiskProfile(
        application_id=application_id,
        stage=RiskStageEnum.final,
        overall_risk=overall,
        **levels,
    )
    db.add(risk_profile)
    db.flush()

    audit_log_service.write_audit_log(
        db,
        actor_id=None,
        action="risk_profile_computed",
        entity_type="RiskProfile",
        entity_id=risk_profile.id,
        metadata={"stage": "final", "overall_risk": overall.value},
    )

    db.commit()
    db.refresh(risk_profile)
    return risk_profile


# ============================================================
# Reads
# ============================================================

def get_risk_profiles_for_application(db: Session, application_id: int) -> list[RiskProfile]:
    """GET /applications/{id}/risk-profile — officer/admin; may return preliminary
    +/or final rows (both can co-exist, Doc B Stage 5 #1/#2)."""
    return (
        db.query(RiskProfile)
        .filter(RiskProfile.application_id == application_id)
        .all()
    )


def get_final_risk_profile(db: Session, application_id: int) -> Optional[RiskProfile]:
    """Used by decision_readiness_service — only the final-stage row counts
    toward the Decision Readiness gate (Doc B Stage 6 #1)."""
    return (
        db.query(RiskProfile)
        .filter(
            RiskProfile.application_id == application_id,
            RiskProfile.stage == RiskStageEnum.final,
        )
        .first()
    )


# ============================================================
# ContainmentPlan — AI-assist (plain templating, see judgment call #6)
# ============================================================

_FALLBACK_PROCESS_BY_CATEGORY: dict[str, str] = {
    "healthcare": "Revert to existing manual/clinical workflow at the pilot site(s); no patient-facing system dependency during rollback.",
    "sanitation": "Revert to prior manual sanitation tracking/reporting process used before the pilot.",
    "transport": "Revert to existing manual dispatch/scheduling process; no live system dependency during rollback.",
    "education": "Revert to existing classroom/administrative process used prior to the pilot.",
    "agriculture": "Revert to prior manual advisory/reporting process used by the department.",
    "governance": "Revert to existing manual departmental workflow; no citizen-facing system dependency during rollback.",
    "iot_hardware": "Disconnect/decommission deployed hardware; revert to prior manual process with no residual device dependency.",
}


def containment_plan_ai_assist(db: Session, application_id: int) -> dict:
    """
    POST /applications/{id}/containment-plan/ai-assist — officer-owner, advisory
    only, no write (mirrors problem_statement_service.ai_assist_draft's contract).

    Drafts max_scope, fallback_process, data_terms, exit_conditions from already-
    structured PS fields via fixed templates (judgment call #6) — NOT an LLM call,
    NOT a Teammate B seam. Officer edits/approves every field before submitting
    via create_or_update_containment_plan(). support_obligations and
    max_financial_exposure are NOT drafted here — Doc B Stage 5 #8 only lists
    the four fields above as AI-assisted; the other two are officer-authored from
    scratch.
    """
    application, profile, ps = _load_application_and_profile(db, application_id)

    budget_label = ps.budget_range.value if ps.budget_range else "unspecified budget"
    beneficiaries = ps.target_beneficiaries or "the declared target beneficiaries"
    max_scope = f"Pilot scope limited to {beneficiaries}, within budget band {budget_label}."

    fallback_process = _FALLBACK_PROCESS_BY_CATEGORY.get(
        ps.category.value if ps.category else None,
        "Revert to the department's existing manual process used prior to the pilot.",
    )

    if ps.sensitivity_flags:
        data_terms = (
            f"Given declared sensitivity flag(s) ({', '.join(ps.sensitivity_flags)}), "
            f"all pilot data remains government-owned; startup must return or "
            f"irrecoverably delete all data within 30 days of pilot conclusion, "
            f"with written confirmation to the department."
        )
    else:
        data_terms = (
            "No heightened data sensitivity declared. Standard data return/deletion "
            "terms apply at pilot conclusion, per department policy."
        )

    success_condition = ps.success_condition or "the declared success condition"
    period = ps.measurement_period or "the declared measurement period"
    exit_conditions = (
        f"Pilot exits/terminates early if {success_condition} is not on track to be "
        f"met by the end of {period}, at Officer discretion following Independent "
        f"Evaluator input."
    )

    return {
        "max_scope": max_scope,
        "fallback_process": fallback_process,
        "data_terms": data_terms,
        "exit_conditions": exit_conditions,
    }


# ============================================================
# ContainmentPlan — final submit + read
# ============================================================

def create_or_update_containment_plan(db: Session, application_id: int, officer_id: int, data: dict) -> ContainmentPlan:
    """
    POST /applications/{id}/containment-plan — officer-owner; final human-
    submitted values. Requires a final RiskProfile to already exist (Doc B
    Stage 5 #7 — "filled in any time after final RiskProfile exists").

    Upsert, not insert-only (judgment call #5) — resubmitting overwrites the
    existing row's fields rather than raising, since Doc B frames this as
    officer-editable-until-satisfied, not a one-shot lock.
    """
    final_profile = get_final_risk_profile(db, application_id)
    if final_profile is None:
        raise FinalRiskProfileMissingError(
            f"Cannot create ContainmentPlan for application {application_id}: "
            f"no final RiskProfile exists yet"
        )

    plan = (
        db.query(ContainmentPlan)
        .filter(ContainmentPlan.application_id == application_id)
        .first()
    )

    if plan is None:
        plan = ContainmentPlan(application_id=application_id, **data)
        db.add(plan)
        action = "containment_plan_created"
    else:
        for field, value in data.items():
            setattr(plan, field, value)
        action = "containment_plan_updated"

    audit_log_service.write_audit_log(
        db,
        actor_id=officer_id,
        action=action,
        entity_type="ContainmentPlan",
        entity_id=plan.id if plan.id else -1,
        metadata={"fields": list(data.keys())},
    )

    db.commit()
    db.refresh(plan)
    return plan


def get_containment_plan(db: Session, application_id: int) -> Optional[ContainmentPlan]:
    """GET /applications/{id}/containment-plan — officer-owner/admin."""
    return (
        db.query(ContainmentPlan)
        .filter(ContainmentPlan.application_id == application_id)
        .first()
    )