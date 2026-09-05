"""
app/services/compliance_record_service.py
ComplianceRecord — immutable per-application audit snapshot.

Doc C ComplianceRecord decisions followed:
- #1: Admin-triggered on-demand only. No auto-generation at any pipeline
      milestone.
- #2: Per-Application only for MVP. PS-wide records out of scope.
- #3: Each generation creates a NEW immutable row — never overwrites a
      prior snapshot. Multiple snapshots over time are expected and valid.
- #4: snapshot compiled from EligibilityCheck, EvaluationScore-derived
      technical score (via Layer 4's qcbs-score logic, NOT a raw table
      read), COIDeclaration, QCBS final_score, RiskProfile (final),
      ContainmentPlan, SandboxTrial, PilotMilestone+Evidence, KPIVerdict,
      PilotOutcome. PilotMilestone rows keyed by milestone_type (fixed),
      not display_name or row order (Doc C revision note).

⚠️ RESOLVED (was flagged as open conflict, now cleared by Doc A owner):
Doc C §4 lists COIDeclaration as a snapshot input; Doc A §2 originally did
not grant Layer 5 read access to it. Confirmed and approved: Doc A §2 is
being extended with a COIDeclaration read-access entry
(application_id, evaluator_id, declared_conflict, recused) — same
additive pattern used earlier for RiskProfile/ContainmentPlan. Treated as
already-approved per that confirmation; `_compile_coi_declarations` below
reads the table directly.

ASSUMPTION RESOLVED — confirmed against the real qcbs_service.py:
QCBS final_score is not recomputed here (Doc A §6 — resolved:
"ComplianceRecord calls GET /applications/{id}/qcbs-score ... rather than
recomputing"). The real function is
`app.services.qcbs_service.get_qcbs_score(db, application_id) -> dict`,
returning {application_id, technical_score, commercial_score, final_score}.
Note it takes `db` as well as `application_id` — imported directly below,
no more try/except fallback needed.
"""

from typing import Optional

from fastapi import HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.models import (
    Application,
    COIDeclaration,
    ComplianceRecord,
    ContainmentPlan,
    Contract,
    EligibilityCheck,
    Evidence,
    KPIVerdict,
    PilotMilestone,
    PilotOutcome,
    ProblemStatement,
    RiskProfile,
    RiskStageEnum,
    SandboxTrial,
)

from app.services.qcbs_service import (
    get_qcbs_score,
    QCBSServiceError,
)


def _get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return application


def _compile_eligibility(db: Session, application_id: int) -> Optional[dict]:
    check = db.query(EligibilityCheck).filter(
        EligibilityCheck.application_id == application_id
    ).first()
    if check is None:
        return None
    return {
        "dpiit_verified": check.dpiit_verified,
        "entity_valid": check.entity_valid,
        "pan_gst_present": check.pan_gst_present,
        "certification_check": check.certification_check,
        "sector_eligible": check.sector_eligible,
        "overall_result": check.overall_result,
        "reviewed_by": check.reviewed_by,
        "reviewed_at": check.reviewed_at,
    }


def _compile_qcbs(db: Session, application_id: int) -> Optional[dict]:
    """
    Calls the real Layer 4 function directly — confirmed signature:
    get_qcbs_score(db, application_id) -> dict.

    ComplianceRecord can be requested at any pipeline stage (Doc C #1 has
    no state gate), including applications that never reached Stage 3/4
    (e.g. filtered out at eligibility). qcbs_service raises QCBSServiceError
    subclasses (MissingBidError, etc.) for applications not yet in a state
    where QCBS is meaningful — caught here and compiled as None rather than
    letting it break the whole snapshot generation.
    """
    try:
        return get_qcbs_score(db, application_id)
    except QCBSServiceError:
        return None


def _compile_risk_profile(db: Session, application_id: int) -> Optional[dict]:
    profile = db.query(RiskProfile).filter(
        RiskProfile.application_id == application_id,
        RiskProfile.stage == RiskStageEnum.final,
    ).first()
    if profile is None:
        return None
    return {
        "technical_risk": profile.technical_risk,
        "financial_risk": profile.financial_risk,
        "implementation_risk": profile.implementation_risk,
        "cybersecurity_risk": profile.cybersecurity_risk,
        "data_risk": profile.data_risk,
        "scalability_risk": profile.scalability_risk,
        "overall_risk": profile.overall_risk,
        "computed_at": profile.computed_at,
    }


def _compile_containment_plan(db: Session, application_id: int) -> Optional[dict]:
    plan = db.query(ContainmentPlan).filter(
        ContainmentPlan.application_id == application_id
    ).first()
    if plan is None:
        return None
    return {
        "max_scope": plan.max_scope,
        "max_financial_exposure": plan.max_financial_exposure,
        "fallback_process": plan.fallback_process,
        "data_terms": plan.data_terms,
        "exit_conditions": plan.exit_conditions,
        "support_obligations": plan.support_obligations,
    }


def _compile_sandbox_trial(db: Session, application_id: int) -> Optional[dict]:
    trial = db.query(SandboxTrial).filter(
        SandboxTrial.application_id == application_id
    ).first()
    if trial is None:
        return None
    return {
        "functional_check": trial.functional_check,
        "directional_kpi_check": trial.directional_kpi_check,
        "operational_fit_check": trial.operational_fit_check,
        "no_red_flags_check": trial.no_red_flags_check,
        "verdict": trial.verdict,
        "verification_mode": trial.verification_mode,
        "verified_by": trial.verified_by,
        "started_at": trial.started_at,
        "completed_at": trial.completed_at,
    }


def _compile_coi_declarations(db: Session, application_id: int) -> list[dict]:
    """
    Per your captain's confirmation: pull ALL COIDeclaration rows for the
    application — every evaluator, not just recused=true. An empty or
    all-clear conflict history is itself audit-relevant, consistent with
    the platform's defensibility framing (§1.1).
    """
    declarations = db.query(COIDeclaration).filter(
        COIDeclaration.application_id == application_id
    ).all()
    return [
        {
            "evaluator_id": d.evaluator_id,
            "declared_conflict": d.declared_conflict,
            "recused": d.recused,
            "declared_at": d.declared_at,
        }
        for d in declarations
    ]


def _compile_milestones(db: Session, contract_id: int) -> list[dict]:
    """
    Keyed by milestone_type (fixed 5-value enum), not display_name or row
    order — per Doc C's revision note, so the CAG/audit-facing record keeps
    the same comparable 5-stage skeleton regardless of what label an
    officer chose. display_name is carried along only as an annotation.
    """
    milestones = db.query(PilotMilestone).filter(
        PilotMilestone.contract_id == contract_id
    ).all()

    compiled = []
    for m in milestones:
        evidence_rows = db.query(Evidence).filter(Evidence.milestone_id == m.id).all()
        compiled.append({
            "milestone_type": m.milestone_type,
            "display_name": m.display_name,  # annotation only, never a substitute key
            "due_date": m.due_date,
            "status": m.status,
            "payment_status": m.payment_status,
            "target_value": m.target_value,
            "target_unit": m.target_unit,
            "submitted_value": m.submitted_value,
            "completed_at": m.completed_at,
            "evidence": [
                {
                    "source_tag": e.source_tag,
                    "file_reference": e.file_reference,
                    "submitted_at": e.submitted_at,
                }
                for e in evidence_rows
            ],
        })
    return compiled


def _compile_kpi_verdicts(db: Session, contract_id: int) -> list[dict]:
    verdicts = db.query(KPIVerdict).filter(KPIVerdict.contract_id == contract_id).all()
    return [
        {
            "kpi_id": v.kpi_id,
            "verdict": v.verdict,
            "verification_mode": v.verification_mode,
            "verified_by": v.verified_by,
            "justification": v.justification,
            "verified_at": v.verified_at,
        }
        for v in verdicts
    ]


def _compile_pilot_outcome(db: Session, contract_id: int) -> Optional[dict]:
    outcome = db.query(PilotOutcome).filter(PilotOutcome.contract_id == contract_id).first()
    if outcome is None:
        return None
    return {
        "overall_result": outcome.overall_result,
        "rationale": outcome.rationale,
        "decided_by": outcome.decided_by,
        "decided_at": outcome.decided_at,
    }


def generate_compliance_record(
    db: Session,
    application_id: int,
    generated_by: int,
) -> ComplianceRecord:
    application = _get_application_or_404(db, application_id)

    ps = db.query(ProblemStatement).filter(
        ProblemStatement.id == application.problem_statement_id
    ).first()
    if ps is None:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application references a missing problem statement",
        )

    contract = db.query(Contract).filter(Contract.application_id == application_id).first()

    snapshot = {
        "application_id": application_id,
        "application_status": application.status,
        "eligibility": _compile_eligibility(db, application_id),
        "qcbs": _compile_qcbs(db, application_id),
        "coi_declarations": _compile_coi_declarations(db, application_id),
        "risk_profile": _compile_risk_profile(db, application_id),
        "containment_plan": _compile_containment_plan(db, application_id),
        "sandbox_trial": _compile_sandbox_trial(db, application_id),
        "contract": (
            {
                "clause_snapshot": contract.clause_snapshot,
                "signed_at": contract.signed_at,
                "created_at": contract.created_at,
            }
            if contract else None
        ),
        "milestones": _compile_milestones(db, contract.id) if contract else [],
        "kpi_verdicts": _compile_kpi_verdicts(db, contract.id) if contract else [],
        "pilot_outcome": _compile_pilot_outcome(db, contract.id) if contract else None,
    }

    record = ComplianceRecord(
        problem_statement_id=ps.id,
        application_id=application_id,
        generated_by=generated_by,
        snapshot=snapshot,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_compliance_records(db: Session, application_id: int) -> list[ComplianceRecord]:
    _get_application_or_404(db, application_id)
    return (
        db.query(ComplianceRecord)
        .filter(ComplianceRecord.application_id == application_id)
        .order_by(ComplianceRecord.generated_at.desc())
        .all()
    )


def get_compliance_record(db: Session, record_id: int) -> ComplianceRecord:
    record = db.query(ComplianceRecord).filter(ComplianceRecord.id == record_id).first()
    if record is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Compliance record not found",
        )
    return record