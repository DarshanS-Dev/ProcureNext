"""
Pydantic schemas — Layers 1-4 + AuditLog (Darshan's ownership).

Conventions locked for this file:
- {Model}Base / {Model}Create / {Model}Read used where there's real field
  overlap worth sharing; tiny models skip Base and go straight to Create/Read.
- {Model}Update written standalone (all fields Optional) — PATCH semantics
  don't inherit cleanly from Base.
- Enums imported directly from app.models — never redefined here.
- Flat/separate schemas only, no nesting — matches Doc D's 1:1 endpoint design.
  Exception: GET /startup/profile/{user_id} returns a merged User+StartupProfile
  shape by explicit decision (see StartupProfileMergedRead).
- Computed/derived (non-column) values: bolted onto an existing Read schema if
  they describe a property of that one row (e.g. locked-field-editable flag,
  invite conversion); standalone schema named after the endpoint if they're a
  cross-table aggregate with no single owning row (e.g. Decision Readiness,
  QCBS score, scoring completeness).
- AuditLogRead lives here (teammate imports it) — no write schema exists since
  no endpoint ever accepts a client-submitted AuditLog row.

# JUDGMENT CALL markers below flag spots with no DB row to copy fields from —
# confirm or redirect these; everything else is a direct lift from models.py/PRD.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models import (
    ApplicationStatusEnum,
    ArchitectureTagEnum,
    BudgetRangeEnum,
    CategoryEnum,
    CertificationCheckEnum,
    ChecklistStatusEnum,
    DpiitStatusEnum,
    FundingBandEnum,
    OverallEligibilityEnum,
    PanGstEnum,
    PassFailNCEnum,
    PSStatusEnum,
    RiskLevelEnum,
    RiskStageEnum,
    RoleEnum,
)


# ============================================================
# LAYER 1 — ACTORS
# ============================================================

# --- User ---

class UserCreate(BaseModel):
    """Input for POST /auth/register (startup only — role forced server-side)
    and POST /admin/users (admin sets role explicitly for non-startup accounts)."""
    email: str
    password: str
    name: str
    role: Optional[RoleEnum] = None  # ignored/forced to 'startup' on /auth/register


class UserRead(BaseModel):
    """Response shape for a User row, standalone (no embedded StartupProfile)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role: RoleEnum
    created_at: datetime


class LoginRequest(BaseModel):
    """Input for POST /auth/login."""
    email: str
    password: str


class TokenResponse(BaseModel):
    """JWT access-token response, 24h expiry, no refresh token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400


# --- StartupProfile ---

class StartupProfileLevel1Update(BaseModel):
    """Input for PATCH /startup/profile/level1."""
    entity_type: Optional[str] = None
    dpiit_number: Optional[str] = None
    pan: Optional[str] = None
    gst: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    stage: Optional[str] = None
    sector_tags: Optional[list[str]] = None


class StartupProfileLevel2Update(BaseModel):
    """Input for PATCH /startup/profile/level2.

    # Risk/Containment lock: trl_stage/architecture/funding_band were free text,
    # now structured dropdowns feeding risk_containment_service.py's lookup
    # tables (formulas can't do math on strings like "seed" or "TRL 5ish").
    """
    team_headcount: Optional[int] = None
    tech_stack: Optional[list[str]] = None
    trl_stage: Optional[int] = None  # 1-9, real TRL standard — service validates range
    architecture: Optional[list[ArchitectureTagEnum]] = None  # fixed checkbox set
    api_available: Optional[bool] = None
    past_deployments: Optional[list] = None
    funding_band: Optional[FundingBandEnum] = None  # risk-input ONLY, never eligibility/scoring
    description: Optional[str] = None  # feeds semantic matching


class StartupProfileRead(BaseModel):
    """Standalone StartupProfile response shape (Level 1 + Level 2 + compliance fields)."""
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    entity_type: Optional[str] = None
    dpiit_number: Optional[str] = None
    pan: Optional[str] = None
    gst: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    stage: Optional[str] = None
    sector_tags: Optional[list[str]] = None
    team_headcount: Optional[int] = None
    tech_stack: Optional[list[str]] = None
    trl_stage: Optional[int] = None
    architecture: Optional[list[ArchitectureTagEnum]] = None
    api_available: Optional[bool] = None
    past_deployments: Optional[list] = None
    funding_band: Optional[FundingBandEnum] = None
    description: Optional[str] = None
    dpiit_status: DpiitStatusEnum
    entity_verified: bool
    pan_verified: bool
    gst_verified: bool
    compliance_verified_at: Optional[datetime] = None
    compliance_verified_by: Optional[int] = None


class StartupProfileMergedRead(BaseModel):
    """Merged User + StartupProfile response — used ONLY by
    GET /startup/profile/{user_id} (officer/evaluator/independent_evaluator/admin view)
    and GET /startup/profile (self view). Explicit exception to the flat-schema rule.

    # JUDGMENT CALL: proposed merge = full User fields (minus password_hash) +
    # full StartupProfileRead fields, flattened into one object. If a viewer role
    # shouldn't see certain fields (e.g. should evaluators see funding_band before
    # QCBS/risk stage?), that'd need per-role response filtering — not modeled here,
    # everyone with route access sees everything. Confirm this is fine for MVP.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role: RoleEnum
    created_at: datetime

    entity_type: Optional[str] = None
    dpiit_number: Optional[str] = None
    pan: Optional[str] = None
    gst: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    stage: Optional[str] = None
    sector_tags: Optional[list[str]] = None
    team_headcount: Optional[int] = None
    tech_stack: Optional[list[str]] = None
    trl_stage: Optional[int] = None
    architecture: Optional[list[ArchitectureTagEnum]] = None
    api_available: Optional[bool] = None
    past_deployments: Optional[list] = None
    funding_band: Optional[FundingBandEnum] = None
    description: Optional[str] = None
    dpiit_status: DpiitStatusEnum
    entity_verified: bool
    pan_verified: bool
    gst_verified: bool
    compliance_verified_at: Optional[datetime] = None
    compliance_verified_by: Optional[int] = None


class ComplianceVerificationRequest(BaseModel):
    """Input for POST /admin/startups/{user_id}/verify-compliance — all four fields
    submitted together, single pass (§5.1)."""
    dpiit_status: DpiitStatusEnum
    entity_verified: bool
    pan_verified: bool
    gst_verified: bool


# ============================================================
# LAYER 2 — PROBLEM STATEMENT
# ============================================================

class ProblemStatementBase(BaseModel):
    """Shared fields between Create and Read."""
    title: str
    description: Optional[str] = None
    category: CategoryEnum
    target_beneficiaries: Optional[str] = None
    baseline: Optional[str] = None
    target: Optional[str] = None
    measurement_method: Optional[str] = None
    measurement_period: Optional[str] = None
    budget_range: Optional[BudgetRangeEnum] = None  # was free text — Risk/Containment lock
    budget_description: Optional[str] = None  # NEW — free-text narrative companion, risk-inert
    sensitivity_flags: Optional[list[str]] = None
    success_condition: Optional[str] = None
    additional_required_documents: Optional[list[str]] = None


class ProblemStatementCreate(ProblemStatementBase):
    """Input for POST /problem-statements."""
    pass


class ProblemStatementRead(ProblemStatementBase):
    """Response for GET /problem-statements/{id} and list endpoint."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    officer_id: int
    status: PSStatusEnum
    created_at: datetime
    published_at: Optional[datetime] = None
    commercial_unlocked_at: Optional[datetime] = None
    is_locked_field_editable: bool  # computed: zero Applications exist for this PS


class ProblemStatementUpdate(BaseModel):
    """Input for PATCH /problem-statements/{id} — all fields Optional. Service layer
    enforces draft=any field, published=only locked-fields-if-zero-Applications."""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[CategoryEnum] = None
    target_beneficiaries: Optional[str] = None
    baseline: Optional[str] = None
    target: Optional[str] = None
    measurement_method: Optional[str] = None
    measurement_period: Optional[str] = None
    budget_range: Optional[BudgetRangeEnum] = None
    budget_description: Optional[str] = None
    sensitivity_flags: Optional[list[str]] = None
    success_condition: Optional[str] = None
    additional_required_documents: Optional[list[str]] = None


class ProblemStatementAiAssistRequest(BaseModel):
    """Input for POST /problem-statements/{id}/ai-assist — rough officer text."""
    rough_text: str


class ProblemStatementAiAssistResponse(BaseModel):
    """Advisory-only suggestions. Never blocks publish."""
    suggested_baseline_question: Optional[str] = None
    suggested_measurement_method: Optional[str] = None
    is_outcome_based: bool
    rewrite_suggestion: Optional[str] = None


# --- KPI (Layer 5 table, creation endpoint lives on Problem Statements — Doc C gap-fix) ---

class KPICreate(BaseModel):
    """Input for POST /problem-statements/{id}/kpis."""
    name: str
    baseline: Optional[str] = None
    target: Optional[str] = None
    measurement_method: Optional[str] = None


class KPIRead(BaseModel):
    """Response for GET /problem-statements/{id}/kpis."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_statement_id: int
    name: str
    baseline: Optional[str] = None
    target: Optional[str] = None
    measurement_method: Optional[str] = None


# ============================================================
# LAYER 3 — APPLICATION
# ============================================================

class ApplicationCreate(BaseModel):
    """Input for POST /applications. problem_statement_id from body; startup_id
    from auth context."""
    problem_statement_id: int
    technical_proposal: Optional[dict] = None
    commercial_proposal: Optional[dict] = None


class ApplicationRead(BaseModel):
    """Response for GET /applications/{id} and list endpoints. Flat — no embedded
    EligibilityCheck/scores/etc; those are separate endpoints per Doc D."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_statement_id: int
    startup_id: int
    technical_proposal: Optional[dict] = None
    commercial_proposal: Optional[dict] = None
    status: ApplicationStatusEnum
    created_at: datetime


class EligibilityCheckRead(BaseModel):
    """Response for GET /applications/{id}/eligibility-check.

    # JUDGMENT CALL: exposing raw snapshot fields (dpiit_verified, entity_valid,
    # pan_gst_present) as-is rather than collapsing to a single "compliance_ok"
    # bool — keeps audit-trail transparency (matches ComplianceRecord philosophy
    # of showing what was true at check time). Confirm this level of detail is
    # wanted on this read endpoint vs. a simplified view.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    dpiit_verified: Optional[PassFailNCEnum] = None
    entity_valid: Optional[PassFailNCEnum] = None
    pan_gst_present: Optional[PanGstEnum] = None
    certification_check: Optional[CertificationCheckEnum] = None
    sector_eligible: Optional[PassFailNCEnum] = None
    overall_result: Optional[OverallEligibilityEnum] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class EligibilityCheckReviewUpdate(BaseModel):
    """Input for PATCH /applications/{id}/eligibility-check — officer sets
    sector_eligible/certification_check; reviewed_by/reviewed_at set server-side."""
    sector_eligible: Optional[PassFailNCEnum] = None
    certification_check: Optional[CertificationCheckEnum] = None


class SelectionDecisionCreate(BaseModel):
    """Input for POST /applications/{id}/select. Empty body — officer_id from auth
    context, application_id from path. Server enforces Decision Readiness gate."""
    pass


class SelectionDecisionRead(BaseModel):
    """Response shape for a SelectionDecision row."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_statement_id: int
    application_id: int
    officer_id: int
    decided_at: datetime


# ============================================================
# LAYER 4 — EVALUATION PIPELINE
# ============================================================

# --- Stage 1: Checklist ---

class ChecklistItemRead(BaseModel):
    """Response for GET /applications/{id}/checklist."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    document_name: str
    status: ChecklistStatusEnum
    file_reference: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None


class ChecklistItemUploadUpdate(BaseModel):
    """Input for PATCH /applications/{id}/checklist/{item_id} — startup uploads."""
    file_reference: str


class ChecklistItemReviewUpdate(BaseModel):
    """Input for PATCH /applications/{id}/checklist/{item_id}/review."""
    status: ChecklistStatusEnum  # expected: verified/rejected


# --- Stage 2: Evaluator Assignment + COI ---
# NOTE: implementation details not yet brainstormed (per project instructions) —
# fields below are best-guess placeholders subject to change once that stage is locked.

class PSEvaluatorAssignmentCreate(BaseModel):
    """Input for POST /problem-statements/{id}/evaluators (admin, initial assignment)."""
    evaluator_id: int


class PSEvaluatorAssignmentReplaceRequest(BaseModel):
    """Input for POST /problem-statements/{id}/evaluators/replace."""
    new_evaluator_id: int
    old_evaluator_id: int
    recused_application_id: int


class PSEvaluatorAssignmentRead(BaseModel):
    """Response shape for a PSEvaluatorAssignment row."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_statement_id: int
    evaluator_id: int
    assigned_by: int
    assigned_at: datetime


class COIDeclarationCreate(BaseModel):
    """Input for POST /applications/{id}/coi-declaration."""
    declared_conflict: bool


class COIDeclarationRead(BaseModel):
    """Response shape for a COIDeclaration row."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    evaluator_id: int
    declared_conflict: bool
    recused: bool
    declared_at: datetime


# --- Stage 3: Technical Scoring ---

class RubricCriterionRead(BaseModel):
    """Response for GET /rubric-criteria — the 7 seeded platform-wide rows."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: Optional[CategoryEnum] = None
    name: str
    weight: float


class EvaluationScoreEntry(BaseModel):
    """One entry within a scores submission."""
    criterion_id: int
    score: float
    justification: str


class EvaluationScoreCreate(BaseModel):
    """Input for POST /applications/{id}/scores — array of EvaluationScoreEntry."""
    scores: list[EvaluationScoreEntry]


class EvaluationScoreRead(BaseModel):
    """Response shape for a single EvaluationScore row."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    evaluator_id: int
    criterion_id: int
    score: float
    justification: str
    created_at: datetime


class ScoreCompletenessRead(BaseModel):
    """Standalone response for GET /applications/{id}/scores/completeness.

    # JUDGMENT CALL: shape below — confirm field names are what frontend expects.
    """
    complete: bool
    pending_evaluator_ids: list[int]


# --- Stage 4: QCBS (query-time only, no writes) ---

class QCBSScoreRead(BaseModel):
    """Standalone response for GET /applications/{id}/qcbs-score.

    # JUDGMENT CALL: exposing technical_score and commercial_score alongside
    # final_score (not just final_score alone) so the officer/ComplianceRecord
    # can show the breakdown, not just the combined number. Confirm wanted.
    """
    application_id: int
    technical_score: float
    commercial_score: float
    final_score: float


class QCBSRankingEntry(BaseModel):
    """One row within the ranked list for GET /problem-statements/{id}/qcbs-ranking."""
    application_id: int
    startup_id: int
    technical_score: float
    commercial_score: float
    final_score: float
    rank: int


class QCBSRankingRead(BaseModel):
    """Standalone response wrapping the ranked list for a PS."""
    problem_statement_id: int
    rankings: list[QCBSRankingEntry]


# --- Stage 5: Risk Profile + Containment Plan ---

class RiskProfileRead(BaseModel):
    """Response for GET /applications/{id}/risk-profile — system-computed, no POST.
    May return preliminary and/or final stage rows (list, since both can co-exist)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    technical_risk: RiskLevelEnum
    financial_risk: RiskLevelEnum
    implementation_risk: RiskLevelEnum
    cybersecurity_risk: RiskLevelEnum
    data_risk: RiskLevelEnum
    scalability_risk: RiskLevelEnum
    overall_risk: RiskLevelEnum
    stage: RiskStageEnum
    computed_at: datetime


class ContainmentPlanAiAssistRequest(BaseModel):
    """Input for POST /applications/{id}/containment-plan/ai-assist — advisory only,
    no write. Empty body; server derives inputs from PS + Application data."""
    pass


class ContainmentPlanAiAssistResponse(BaseModel):
    """Advisory draft values — officer edits/approves before submitting via
    ContainmentPlanCreate."""
    max_scope: Optional[str] = None
    fallback_process: Optional[str] = None
    data_terms: Optional[str] = None
    exit_conditions: Optional[str] = None


class ContainmentPlanCreate(BaseModel):
    """Input for POST /applications/{id}/containment-plan — final human-submitted
    values for all six fields."""
    max_scope: Optional[str] = None
    max_financial_exposure: Optional[str] = None
    fallback_process: Optional[str] = None
    data_terms: Optional[str] = None
    exit_conditions: Optional[str] = None
    support_obligations: Optional[str] = None


class ContainmentPlanRead(BaseModel):
    """Response shape for a ContainmentPlan row."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    max_scope: Optional[str] = None
    max_financial_exposure: Optional[str] = None
    fallback_process: Optional[str] = None
    data_terms: Optional[str] = None
    exit_conditions: Optional[str] = None
    support_obligations: Optional[str] = None
    created_at: datetime


# --- Stage 6: Decision Readiness ---

class DecisionReadinessRead(BaseModel):
    """Standalone response for GET /applications/{id}/decision-readiness.

    # JUDGMENT CALL: field names/shape below — six individual bool checks plus
    # an overall_ready rollup, matching Doc B Stage 6 #1's six-item list exactly.
    # Confirm this is the shape frontend wants (vs. e.g. a list of {check, passed}).
    """
    application_id: int
    eligibility_passed: bool
    stage3_scoring_complete: bool
    no_unresolved_coi: bool
    commercial_unlocked: bool
    final_risk_profile_exists: bool
    containment_plan_exists: bool
    overall_ready: bool


# ============================================================
# CROSS-CUTTING — AUDIT LOG
# ============================================================

class AuditLogRead(BaseModel):
    """Response shape for an AuditLog row. Read-only — no write schema exists;
    every AuditLog insert is a server-side side effect of some other endpoint.
    Imported by Layer 5 code as well (shared table, Doc A §5)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: int
    timestamp: datetime
    log_metadata: Optional[dict] = None