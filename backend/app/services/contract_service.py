"""
app/services/contract_service.py
Stage B — Contract creation and retrieval.

Doc A §3 rules strictly followed:
- Never write Application.status directly.
- Call mark_application_contracted(db, application_id) immediately on contract creation.
- mark_application_contracted signature: (db, application_id: int) -> None — takes db arg.

Doc C Stage B decisions followed:
- Contract created only if SandboxTrial.verdict = promising (#1).
- clause_snapshot = static lookup keyed by ProblemStatement.category (#2).
- initiated_by = officer from auth context (#3).
- mark_application_contracted called immediately on creation (#4).
- 5 PilotMilestone rows auto-created at creation (#5).
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status

from app.models import (
    Application,
    Contract,
    PilotMilestone,
    ProblemStatement,
    SandboxTrial,
    SandboxVerdictEnum,
    MilestoneTypeEnum,
    MilestoneStatusEnum,
    PaymentStatusEnum,
)
from app.services.application_service import mark_application_contracted
# Actual signature: mark_application_contracted(db, application_id) -> None
# Confirmed from Darshan's application_service.py — takes db as first arg.


# ---- Clause snapshot templates (Doc C Stage B #2) ----
# Hardcoded by category. Content is intentionally a placeholder
# per PRD §19 open question — exact clause text is TBD.
# Structure is fixed: keys match the 6 ContainmentPlan fields
# (Doc A §2) plus standard IP/data/liability/cybersecurity clauses (PRD §02).
_CLAUSE_TEMPLATES = {
    "healthcare": {
        "ip_clause": "IP generated during the pilot vests with the Government of Maharashtra. Startup retains rights to pre-existing IP.",
        "data_clause": "Patient data must be anonymized. No data may leave approved servers. DISHA compliance required.",
        "liability_clause": "Startup liability capped at pilot contract value. Department indemnified against third-party data breach claims.",
        "cybersecurity_clause": "CERT-In guidelines apply. Mandatory incident reporting within 6 hours.",
        "exit_clause": "On exit, all patient data returned or destroyed within 7 days. Handover documentation mandatory.",
        "category": "healthcare",
    },
    "sanitation": {
        "ip_clause": "IP generated during the pilot vests with the Government of Maharashtra.",
        "data_clause": "No personally identifiable beneficiary data collected without explicit consent.",
        "liability_clause": "Startup liability capped at pilot contract value.",
        "cybersecurity_clause": "Standard government cybersecurity guidelines apply.",
        "exit_clause": "All operational data handed over to department within 14 days of exit.",
        "category": "sanitation",
    },
    "transport": {
        "ip_clause": "IP generated during the pilot vests with the Government of Maharashtra.",
        "data_clause": "GPS/location data retained only for pilot duration. No third-party sharing.",
        "liability_clause": "Startup liability capped at pilot contract value. Public liability insurance required.",
        "cybersecurity_clause": "Real-time system monitoring required. CERT-In guidelines apply.",
        "exit_clause": "All route/operational data returned to department within 14 days.",
        "category": "transport",
    },
    "education": {
        "ip_clause": "IP generated during the pilot vests with the Government of Maharashtra.",
        "data_clause": "Student data governed by applicable data protection rules. No data commercialization.",
        "liability_clause": "Startup liability capped at pilot contract value.",
        "cybersecurity_clause": "Standard government cybersecurity guidelines apply.",
        "exit_clause": "All student data returned or destroyed within 7 days of exit.",
        "category": "education",
    },
    "agriculture": {
        "ip_clause": "IP generated during the pilot vests with the Government of Maharashtra.",
        "data_clause": "Farmer/beneficiary data not to be shared with agri-commercial entities.",
        "liability_clause": "Startup liability capped at pilot contract value.",
        "cybersecurity_clause": "Standard government cybersecurity guidelines apply.",
        "exit_clause": "All operational data handed over within 14 days.",
        "category": "agriculture",
    },
    "governance": {
        "ip_clause": "IP generated during the pilot vests with the Government of Maharashtra.",
        "data_clause": "Citizen data governed by applicable data protection rules. No third-party access.",
        "liability_clause": "Startup liability capped at pilot contract value.",
        "cybersecurity_clause": "CERT-In guidelines apply. Mandatory incident reporting within 6 hours.",
        "exit_clause": "All data returned or destroyed within 7 days. Full handover documentation required.",
        "category": "governance",
    },
    "iot_hardware": {
        "ip_clause": "IP generated during the pilot vests with the Government of Maharashtra. Hardware design IP negotiated separately.",
        "data_clause": "Sensor/telemetry data retained only for pilot duration.",
        "liability_clause": "Startup liability capped at pilot contract value. Hardware damage/loss liability defined separately.",
        "cybersecurity_clause": "IoT device security standards apply. No remote access without prior written approval.",
        "exit_clause": "Hardware returned or disposed per department instructions. All data wiped within 7 days.",
        "category": "iot_hardware",
    },
}

# Fixed milestone creation order per Doc C Stage C #1.
_MILESTONE_ORDER = [
    MilestoneTypeEnum.deployment,
    MilestoneTypeEnum.field_testing,
    MilestoneTypeEnum.outcome_measurement,
    MilestoneTypeEnum.independent_verification,
    MilestoneTypeEnum.final_decision,
]


def create_contract(
    db: Session,
    application_id: int,
    officer_id: int,
) -> Contract:
    # --- 1. Fetch application ---
    application = db.query(Application).filter(
        Application.id == application_id
    ).first()
    if application is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # --- 2. Must be in selected status (Doc A §4) ---
    if application.status != "selected":
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Application must be in 'selected' status to create a contract, got '{application.status}'",
        )

    # --- 3. SandboxTrial must exist and verdict must be promising (Doc C Stage B #1) ---
    trial = db.query(SandboxTrial).filter(
        SandboxTrial.application_id == application_id
    ).first()
    if trial is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="No sandbox trial found for this application",
        )
    if trial.verdict != SandboxVerdictEnum.promising:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Sandbox trial verdict must be 'promising' to create a contract, got '{trial.verdict}'",
        )

    # --- 4. No duplicate contracts (unique application_id on Contract) ---
    existing = db.query(Contract).filter(
        Contract.application_id == application_id
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Contract already exists for this application",
        )

    # --- 5. Build clause_snapshot from ProblemStatement.category (Doc C Stage B #2) ---
    ps = db.query(ProblemStatement).filter(
        ProblemStatement.id == application.problem_statement_id
    ).first()
    if ps is None:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ProblemStatement not found for this application",
        )
    clause_snapshot = _CLAUSE_TEMPLATES.get(ps.category.value, _CLAUSE_TEMPLATES["governance"])

    # --- 6. Create Contract row ---
    contract = Contract(
        application_id=application_id,
        clause_snapshot=clause_snapshot,
        initiated_by=officer_id,
    )
    db.add(contract)
    db.flush()  # get contract.id without committing yet

    # --- 7. Auto-create 5 PilotMilestone rows (Doc C Stage C #1) ---
    for milestone_type in _MILESTONE_ORDER:
        milestone = PilotMilestone(
            contract_id=contract.id,
            milestone_type=milestone_type,
            status=MilestoneStatusEnum.pending,
            payment_status=PaymentStatusEnum.not_due,
            # due_date, target_value, target_unit, display_name all left null —
            # Officer fills these in via PATCH /contracts/{id}/milestones/{milestone_id}
        )
        db.add(milestone)

    db.commit()
    db.refresh(contract)

    # --- 8. Call mark_application_contracted immediately (Doc A §3, Doc C Stage B #4) ---
    # Called after commit so the Contract row is persisted before the status transition.
    mark_application_contracted(db=db, application_id=application_id)

    return contract


def get_contract(db: Session, application_id: int) -> Contract:
    contract = db.query(Contract).filter(
        Contract.application_id == application_id
    ).first()
    if contract is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Contract not found for this application",
        )
    return contract