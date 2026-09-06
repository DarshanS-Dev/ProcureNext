"""
app/services/application_service.py

Layer 3 — Application lifecycle (Doc B, PRD §16, Doc A §3/§4).

Owns:
- Application creation (with gating) + synchronous checklist resolution
  + auto-created EligibilityCheck row + snapshot fields
- EligibilityCheck review (per-application fields) + overall_result
  computation + resulting Application.status transitions
- Read access for Application / EligibilityCheck
- The three Layer 5 -> Layer 3 handoff functions (Doc A §3) — the ONLY
  legal way anything outside this file may move Application.status into
  contracted/completed/not_selected (sandbox fallback).

Hard rule (Doc A §1/§3): Application.status is written ONLY from this file.
No other service, including Layer 5's, should ever do
`application.status = ...` directly — Layer 5 calls the three functions
at the bottom instead.

Judgment calls flagged inline (no schema/PRD line to point to):

1. `create_application` blocks unless `ProblemStatement.status == published`.
   Not explicitly stated in Doc B Layer 3 — Doc B's gates are Level 2 +
   compliance_verified_at only. But PRD §02 goals frame the whole flow as
   "post -> discover -> screen -> evaluate", and a draft/closed PS has no
   business accepting new Applications (closed PS blocking new Applications
   is explicit in Doc B Layer 2 #8; draft PS was never published so
   couldn't have been discovered/invited-to in the first place). Confirmed
   with Darshan this session — enforcing PS.status == published as a
   service-layer gate, same style as the other two gates.

2. Dynamic checklist resolution (Doc B Stage 1 #1-2) is called out to
   `checklist_service.resolve_checklist_for_application(db, application)`
   inside the same transaction, per Stage 1 #1 ("runs synchronously inside
   the POST /applications transaction"). `checklist_service.py` is the
   next file to be written this session — this call is written as a real
   call, not a stub/TODO, per direction.

3. Preliminary RiskProfile auto-computation (Doc B Stage 5 #1: fires the
   moment EligibilityCheck.overall_result = eligible) is NOT called from
   here yet. `risk_containment_service.py` does not exist yet and is not
   next in the build order (checklist_service is). Left as an explicit
   flagged seam below (`# SEAM:`) rather than silently wired in, so it
   doesn't get forgotten when risk_containment_service.py is written.

4. `reviewed_by` is required (not optional) on `update_eligibility_check`
   — Doc B L3 #2 says reviewed_by = Officer, and an eligibility verdict
   with no recorded reviewer would break the audit trail's purpose. The
   Officer identity is expected to come from the authenticated caller via
   the router (RBAC-checked there), not re-validated here as a role.

5. `overall_result` recomputation only fires off `sector_eligible` +
   `certification_check` (the two genuinely per-application fields, Doc B
   L3 #2 note) plus the pre-existing snapshot fields (`dpiit_verified`,
   `entity_valid`, `pan_gst_present`) already sitting on the row from
   creation time. All five together determine the pass/fail/needs_clarification
   mix per Doc B L3 #3. `pan_gst_present` has no `needs_clarification` value
   in its enum (pass/fail only, per models.py) — handled naturally since
   the aggregation only checks for the presence of "fail" / "needs_clarification"
   strings, not a fixed field list.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Application,
    ApplicationStatusEnum,
    EligibilityCheck,
    OverallEligibilityEnum,
    PassFailNCEnum,
    CertificationCheckEnum,
    ProblemStatement,
    PSStatusEnum,
    StartupProfile,
)
from app.services import audit_log_service, checklist_service, risk_containment_service


# ============================================================
# Errors
# ============================================================

class ApplicationServiceError(Exception):
    """Base error for application_service — routers translate to HTTP."""


class ComplianceNotVerifiedError(ApplicationServiceError):
    pass


class IncompleteProfileError(ApplicationServiceError):
    pass


class ProblemStatementNotOpenError(ApplicationServiceError):
    pass


class DuplicateApplicationError(ApplicationServiceError):
    pass


class ApplicationNotFoundError(ApplicationServiceError):
    pass


class EligibilityCheckNotFoundError(ApplicationServiceError):
    pass


# ============================================================
# Level 2 completeness check (Doc B Layer 1 #3)
# ============================================================

_LEVEL2_REQUIRED_FIELDS = (
    "team_headcount",
    "tech_stack",
    "trl_stage",
    "architecture",
    "api_available",
    "past_deployments",
    "funding_band",
    "description",
)


def _is_level2_complete(profile: StartupProfile) -> bool:
    return all(getattr(profile, field) is not None for field in _LEVEL2_REQUIRED_FIELDS)


# ============================================================
# Create Application
# ============================================================

def create_application(
    db: Session,
    startup_id: int,
    problem_statement_id: int,
    technical_proposal: Optional[dict],
    commercial_proposal: Optional[dict],
) -> Application:
    """
    Creates an Application, gated on:
      1. ProblemStatement.status == published (see judgment call #1)
      2. StartupProfile Level 2 fields all present (Doc B L1 #3)
      3. StartupProfile.compliance_verified_at IS NOT NULL (Doc B L3 #4)

    On success, in the same transaction:
      - Application row created, status=applied
      - Dynamic checklist resolved (delegated to checklist_service)
      - EligibilityCheck row auto-created, snapshot fields copied from
        StartupProfile, status flipped -> under_review
      - AuditLog: application_submitted

    Raises ApplicationServiceError subclasses on any gate failure.
    """
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    if ps is None:
        raise ApplicationServiceError(f"ProblemStatement {problem_statement_id} not found")

    if ps.status != PSStatusEnum.published:
        raise ProblemStatementNotOpenError(
            f"ProblemStatement {problem_statement_id} is not open for applications "
            f"(status={ps.status.value})"
        )

    profile = db.query(StartupProfile).filter(StartupProfile.user_id == startup_id).first()
    if profile is None:
        raise IncompleteProfileError(f"No StartupProfile found for startup_id={startup_id}")

    if not _is_level2_complete(profile):
        raise IncompleteProfileError(
            "StartupProfile Level 2 fields incomplete — cannot submit an Application"
        )

    if profile.compliance_verified_at is None:
        raise ComplianceNotVerifiedError(
            "StartupProfile has not completed Admin compliance verification"
        )

    existing = (
        db.query(Application)
        .filter(
            Application.problem_statement_id == problem_statement_id,
            Application.startup_id == startup_id,
        )
        .first()
    )
    if existing is not None:
        raise DuplicateApplicationError(
            f"Application already exists for startup_id={startup_id} "
            f"on problem_statement_id={problem_statement_id}"
        )

    application = Application(
        problem_statement_id=problem_statement_id,
        startup_id=startup_id,
        technical_proposal=technical_proposal,
        commercial_proposal=commercial_proposal,
        status=ApplicationStatusEnum.applied,
    )
    db.add(application)
    db.flush()  # need application.id before resolving checklist / creating EligibilityCheck

    # Doc B Stage 1 #1 — resolution runs synchronously in this same transaction.
    checklist_service.resolve_checklist_for_application(db, application)

    # applied -> under_review: EligibilityCheck auto-created, snapshots copied
    # from StartupProfile (Doc B L3 transition table; PRD §7.1/§16 snapshot rationale).
    eligibility_check = EligibilityCheck(
        application_id=application.id,
        dpiit_verified=_dpiit_status_to_passfail(profile),
        entity_valid=_bool_to_passfail(profile.entity_verified),
        pan_gst_present=_bool_to_pangst(profile.pan_verified and profile.gst_verified),
        certification_check=None,   # genuinely per-application — awaits Officer review
        sector_eligible=None,       # genuinely per-application — awaits Officer review
        overall_result=None,
    )
    db.add(eligibility_check)

    application.status = ApplicationStatusEnum.under_review

    audit_log_service.write_audit_log(
        db,
        actor_id=startup_id,
        action="application_submitted",
        entity_type="Application",
        entity_id=application.id,
        metadata={"problem_statement_id": problem_statement_id},
    )

    db.commit()
    db.refresh(application)
    return application


def _dpiit_status_to_passfail(profile: StartupProfile) -> PassFailNCEnum:
    # dpiit_status is unverified/verified/failed (DpiitStatusEnum);
    # snapshot maps verified->pass, failed->fail, unverified->needs_clarification
    # (an unverified startup should never reach this point given the
    # compliance_verified_at gate above, but mapped defensively rather than
    # assumed impossible).
    mapping = {
        "verified": PassFailNCEnum.pass_,
        "failed": PassFailNCEnum.fail,
        "unverified": PassFailNCEnum.needs_clarification,
    }
    return mapping[profile.dpiit_status.value]


def _bool_to_passfail(value: bool) -> PassFailNCEnum:
    return PassFailNCEnum.pass_ if value else PassFailNCEnum.fail


def _bool_to_pangst(value: bool):
    from app.models import PanGstEnum
    return PanGstEnum.pass_ if value else PanGstEnum.fail


# ============================================================
# EligibilityCheck review (Officer-driven, per-application fields)
# ============================================================

def update_eligibility_check(
    db: Session,
    application_id: int,
    sector_eligible: PassFailNCEnum,
    certification_check: CertificationCheckEnum,
    reviewed_by: int,
) -> EligibilityCheck:
    """
    Officer sets the two genuinely per-application checks, recomputes
    overall_result (Doc B L3 #3), and applies the resulting Application.status
    transition (Doc B L3 #6/#10):

      - any fail among the 5 checks           -> not_eligible -> Application.status = not_selected
      - no fail, any needs_clarification       -> needs_clarification -> Application.status stays under_review (no-op)
      - all pass                                -> eligible -> Application.status = under_evaluation

    SEAM: Doc B Stage 5 #1 says a preliminary RiskProfile should be
    auto-computed the moment overall_result flips to eligible. That trigger
    is NOT wired in here — risk_containment_service.py does not exist yet.
    Marked so it isn't forgotten when that file is written; do not silently
    skip re-checking this.
    """
    eligibility_check = (
        db.query(EligibilityCheck)
        .filter(EligibilityCheck.application_id == application_id)
        .first()
    )
    if eligibility_check is None:
        raise EligibilityCheckNotFoundError(
            f"No EligibilityCheck found for application_id={application_id}"
        )

    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    eligibility_check.sector_eligible = sector_eligible
    eligibility_check.certification_check = certification_check
    eligibility_check.reviewed_by = reviewed_by
    eligibility_check.reviewed_at = datetime.now(timezone.utc)

    all_checks = [
        eligibility_check.dpiit_verified,
        eligibility_check.entity_valid,
        eligibility_check.pan_gst_present,
        eligibility_check.sector_eligible,
        eligibility_check.certification_check,
    ]
    values = [c.value for c in all_checks if c is not None]

    if any(v == "fail" for v in values):
        eligibility_check.overall_result = OverallEligibilityEnum.not_eligible
        application.status = ApplicationStatusEnum.not_selected
    elif any(v == "needs_clarification" for v in values):
        eligibility_check.overall_result = OverallEligibilityEnum.needs_clarification
        # status stays under_review — no-op per Doc B L3 #5
    else:
        eligibility_check.overall_result = OverallEligibilityEnum.eligible
        application.status = ApplicationStatusEnum.under_evaluation

    audit_log_service.write_audit_log(
        db,
        actor_id=reviewed_by,
        action="eligibility_check_reviewed",
        entity_type="EligibilityCheck",
        entity_id=eligibility_check.id,
        metadata={"overall_result": eligibility_check.overall_result.value},
    )

    db.commit()
    db.refresh(eligibility_check)

    # SEAM RESOLVED (Doc B Stage 5 #1): now that risk_containment_service.py
    # exists, fire preliminary RiskProfile computation the moment eligibility
    # flips to `eligible`. Called post-commit as its own transaction — it does
    # its own commit, so it doesn't need to share this function's transaction
    # boundary (same pattern as scoring_service's post-commit QCBS-unlock call).
    if eligibility_check.overall_result == OverallEligibilityEnum.eligible:
        risk_containment_service.compute_preliminary_risk_profile(db, application_id)

    return eligibility_check


# ============================================================
# Reads
# ============================================================

def get_application(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")
    return application


def get_eligibility_check(db: Session, application_id: int) -> EligibilityCheck:
    eligibility_check = (
        db.query(EligibilityCheck)
        .filter(EligibilityCheck.application_id == application_id)
        .first()
    )
    if eligibility_check is None:
        raise EligibilityCheckNotFoundError(
            f"No EligibilityCheck found for application_id={application_id}"
        )
    return eligibility_check


def list_applications_by_problem_statement(db: Session, problem_statement_id: int):
    return (
        db.query(Application)
        .filter(Application.problem_statement_id == problem_statement_id)
        .all()
    )


def list_applications_by_startup(db: Session, startup_id: int):
    return db.query(Application).filter(Application.startup_id == startup_id).all()


# ============================================================
# Layer 5 -> Layer 3 handoff functions (Doc A §3) — SOLE legal writers
# of Application.status for the later transitions. Layer 5 code calls
# these directly (same codebase); never reached via HTTP.
# ============================================================

def mark_application_contracted(db: Session, application_id: int) -> None:
    """selected -> contracted. Called by Layer 5 the instant a Contract
    row is created (Doc A §3)."""
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    application.status = ApplicationStatusEnum.contracted

    audit_log_service.write_audit_log(
        db,
        actor_id=None,
        action="application_contracted",
        entity_type="Application",
        entity_id=application.id,
    )
    db.commit()


def mark_application_completed(db: Session, application_id: int) -> None:
    """contracted -> completed. Called by Layer 5 the instant a PilotOutcome
    is decided, regardless of verdict (Doc A §3)."""
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    application.status = ApplicationStatusEnum.completed

    audit_log_service.write_audit_log(
        db,
        actor_id=None,
        action="application_completed",
        entity_type="Application",
        entity_id=application.id,
    )
    db.commit()


def mark_application_not_selected(db: Session, application_id: int, reason: str) -> None:
    """selected -> not_selected (sandbox fallback only — QCBS-loss and
    eligibility-fail paths write this status from within this file directly,
    not via this function). Called by Layer 5 on sandbox not_promising or
    exhausted-inconclusive (Doc A §3). `reason` is free text, stored only
    in AuditLog metadata — NOT a new Application column (Doc B L3 #6/#9)."""
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise ApplicationNotFoundError(f"Application {application_id} not found")

    application.status = ApplicationStatusEnum.not_selected

    audit_log_service.write_audit_log(
        db,
        actor_id=None,
        action="application_not_selected",
        entity_type="Application",
        entity_id=application.id,
        metadata={"reason": reason},
    )
    db.commit()