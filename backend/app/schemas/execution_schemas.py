"""
Pydantic schemas — Layer 5 (Execution) — Nikhil's ownership.

Covers:
  Stage A — Sandbox Trial
  Stage B — Contract
  Stage C — Pilot Milestone + Evidence
  Stage D — KPI Verdict
  Stage E — Pilot Outcome
  Invite
  ComplianceRecord

SCOPE NOTE (Invite): `converted` on InviteWithConversionRead is not a
stored column — computed live per Doc C Invite #2
(EXISTS(Application WHERE ps_id=X AND startup_id=Y)). The service returns
plain dicts with this shape, not ORM rows.

SCOPE NOTE (ComplianceRecord): `snapshot` is a free-form compiled JSON
blob (see compliance_record_service.generate_compliance_record for its
shape) — typed as Dict[str, Any] rather than a nested model, since its
structure spans data owned by four different layers and isn't itself an
API contract in the same sense the rest of this file is.

SCOPE NOTE (Stage D): KPICreate / KPIRead are NOT in this file. KPI
*creation* is a Layer 2 gap-fix (Doc C Stage D #1; Doc D lists
POST/GET /problem-statements/{id}/kpis under "Problem Statements", not
under KPI Verdicts) and belongs in Darshan's problem-statement schemas.
Layer 5 only consumes KPI rows, via KPIVerdict.

Follows the conventions locked in core_schemas.py (Darshan's file):
- Enums imported directly from app.models — never redefined here.
- {Model}Read used for response shapes (not {Model}Response).
- {Model}Update written standalone (all fields Optional) — PATCH semantics.
- Flat/separate schemas only, no nesting — matches Doc D's 1:1 endpoint design.

Matches the real SandboxTrial model in models.py:
  functional_check, directional_kpi_check, operational_fit_check,
  no_red_flags_check, verdict, verified_by, verification_mode, notes,
  started_at, completed_at.  (No created_at on this table.)

FILE: app/schemas/execution_schemas.py
"""

from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict

from app.models import (
    SandboxCheckEnum,
    SandboxVerdictEnum,
    VerificationModeEnum,
    MilestoneTypeEnum,
    MilestoneStatusEnum,
    PaymentStatusEnum,
    EvidenceSourceEnum,
    KPIVerdictResultEnum,
    PilotOutcomeResultEnum,
)


# ============================================================
# STAGE A — SANDBOX TRIAL
# ============================================================

# ---- POST /applications/{id}/sandbox-trial ----
# Evaluator creates the trial and submits the four checks up front.
# verified_by is NOT in the request body — set server-side from auth context
# (the calling independent_evaluator), matching SelectionDecisionCreate's
# pattern of pulling actor identity from auth, not the client.
class SandboxTrialCreate(BaseModel):
    functional_check: SandboxCheckEnum
    directional_kpi_check: SandboxCheckEnum
    operational_fit_check: SandboxCheckEnum
    no_red_flags_check: SandboxCheckEnum
    verification_mode: VerificationModeEnum
    notes: Optional[str] = None


# ---- PATCH /applications/{id}/sandbox-trial/{trial_id} ----
# Evaluator finalizes — sets/overrides verdict and marks completed.
# verdict is optional here: if omitted, service computes it from the
# four checks already on the row (see sandbox_service.py).
class SandboxTrialUpdate(BaseModel):
    verdict: Optional[SandboxVerdictEnum] = None
    notes: Optional[str] = None


# ---- Response shape for GET / POST / PATCH ----
class SandboxTrialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    functional_check: Optional[SandboxCheckEnum] = None
    directional_kpi_check: Optional[SandboxCheckEnum] = None
    operational_fit_check: Optional[SandboxCheckEnum] = None
    no_red_flags_check: Optional[SandboxCheckEnum] = None
    verdict: Optional[SandboxVerdictEnum] = None
    verified_by: Optional[int] = None
    verification_mode: Optional[VerificationModeEnum] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ============================================================
# STAGE B — CONTRACT
# ============================================================

# ---- POST /applications/{id}/contract ----
# Officer creates the contract. clause_snapshot is built server-side
# from ProblemStatement.category — not submitted by the client.
# initiated_by is set server-side from auth context.
class ContractCreate(BaseModel):
    # No client-supplied fields needed — everything derived server-side.
    # Body can be empty; kept as a schema for consistency + future fields.
    pass


# ---- Response for GET / POST ----
class ContractRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    clause_snapshot: dict
    initiated_by: int
    signed_at: Optional[datetime] = None
    created_at: datetime


# ============================================================
# STAGE C — PILOT MILESTONE + EVIDENCE
# ============================================================

# ---- Response for GET /contracts/{id}/milestones ----
class PilotMilestoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contract_id: int
    milestone_type: MilestoneTypeEnum      # fixed, never officer-editable
    display_name: Optional[str] = None     # cosmetic label, officer-editable (Doc C #3)
    due_date: Optional[date] = None
    status: MilestoneStatusEnum
    payment_status: PaymentStatusEnum
    target_value: Optional[str] = None
    target_unit: Optional[str] = None
    submitted_value: Optional[str] = None
    completed_at: Optional[datetime] = None


# ---- PATCH /contracts/{id}/milestones/{milestone_id} ----
# Officer sets due_date, target_value, target_unit, display_name.
# milestone_type, count of 5, and row order are NOT in this schema
# and must never be accepted from the client (Doc C #1, #3).
class PilotMilestoneUpdate(BaseModel):
    due_date: Optional[date] = None
    target_value: Optional[str] = None
    target_unit: Optional[str] = None
    display_name: Optional[str] = None    # cosmetic only — has zero effect on
                                          # KPIVerdict, PilotOutcome gating,
                                          # mark_application_completed, or
                                          # ComplianceRecord keys (Doc C #3)


# ---- POST /contracts/{id}/milestones/{milestone_id}/evidence ----
# Startup submits evidence. source_tag forced to startup_submitted server-side.
# file_reference is the uploaded file path/URL.
class EvidenceCreate(BaseModel):
    file_reference: str


# ---- Response for Evidence ----
class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    milestone_id: int
    source_tag: EvidenceSourceEnum
    file_reference: Optional[str] = None
    submitted_at: datetime


# ---- PATCH /contracts/{id}/milestones/{milestone_id}/review ----
# Independent evaluator reviews submitted evidence.
# Sets status (accepted/rejected) and payment_status.
class MilestoneReviewUpdate(BaseModel):
    status: MilestoneStatusEnum       # expected: accepted or rejected
    payment_status: PaymentStatusEnum


# ============================================================
# STAGE D — KPI VERDICT
# ============================================================

# ---- POST /contracts/{id}/kpi-verdicts ----
# Independent evaluator submits one verdict per KPI per contract.
# verified_by is NOT in the request body — set server-side from auth context.
# contract_id comes from the path, not the body. kpi_id must reference a KPI
# already created by Layer 2 against this contract's problem statement.
class KPIVerdictCreate(BaseModel):
    kpi_id: int
    verdict: KPIVerdictResultEnum
    verification_mode: VerificationModeEnum
    justification: Optional[str] = None


# ---- Response for GET / POST ----
class KPIVerdictRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kpi_id: int
    contract_id: int
    verdict: KPIVerdictResultEnum
    verification_mode: VerificationModeEnum
    verified_by: int
    justification: Optional[str] = None
    verified_at: datetime


# ============================================================
# STAGE E — PILOT OUTCOME
# ============================================================

# ---- POST /contracts/{id}/pilot-outcome ----
# Officer decides scale/iterate/stop with rationale (Doc C Stage E #2) —
# a human decision, not system-computed. decided_by is set server-side from
# auth context, not the request body.
class PilotOutcomeCreate(BaseModel):
    overall_result: PilotOutcomeResultEnum
    rationale: Optional[str] = None


# ---- Response for GET / POST ----
class PilotOutcomeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contract_id: int
    overall_result: PilotOutcomeResultEnum
    rationale: Optional[str] = None
    decided_by: int
    decided_at: datetime


# ============================================================
# INVITE
# ============================================================

# ---- POST /problem-statements/{id}/invite ----
class InviteCreate(BaseModel):
    startup_id: int


# ---- Response for GET /startup/invites and POST ----
class InviteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_statement_id: int
    startup_id: int
    invited_at: datetime


# ---- Response for GET /problem-statements/{id}/invites ----
# `converted` computed live per Doc C Invite #2 — see module docstring.
class InviteWithConversionRead(BaseModel):
    id: int
    problem_statement_id: int
    startup_id: int
    invited_at: datetime
    converted: bool


# ============================================================
# COMPLIANCE RECORD
# ============================================================

# ---- Response for POST / GET (single + list) ----
class ComplianceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_statement_id: int
    application_id: Optional[int] = None
    generated_at: datetime
    generated_by: int
    snapshot: Dict[str, Any]