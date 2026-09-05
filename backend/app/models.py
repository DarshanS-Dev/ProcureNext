"""
ProcureNext — SQLAlchemy models
Source of truth: PRD v4 §16 (schema locked, 24 tables, 5 layers + cross-cutting).
Implementation-level column choices follow Doc B (Layers 1-4) and Doc C (Layer 5)
where they add detail the PRD left open — priority given to the tech-impl docs
per team convention. Do NOT change table shapes here without re-locking the PRD.
"""

import enum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ============================================================
# ENUMS
# ============================================================

class RoleEnum(str, enum.Enum):
    officer = "officer"
    startup = "startup"
    evaluator = "evaluator"
    independent_evaluator = "independent_evaluator"
    admin = "admin"


class DpiitStatusEnum(str, enum.Enum):
    unverified = "unverified"
    verified = "verified"
    failed = "failed"


class CategoryEnum(str, enum.Enum):
    healthcare = "healthcare"
    sanitation = "sanitation"
    transport = "transport"
    education = "education"
    agriculture = "agriculture"
    governance = "governance"
    iot_hardware = "iot_hardware"


class PSStatusEnum(str, enum.Enum):
    draft = "draft"
    published = "published"
    closed = "closed"


class ApplicationStatusEnum(str, enum.Enum):
    applied = "applied"
    under_review = "under_review"
    under_evaluation = "under_evaluation"
    selected = "selected"
    not_selected = "not_selected"
    contracted = "contracted"
    completed = "completed"


class PassFailNCEnum(str, enum.Enum):
    """pass / fail / needs_clarification — used by most EligibilityCheck sub-checks."""
    pass_ = "pass"
    fail = "fail"
    needs_clarification = "needs_clarification"


class CertificationCheckEnum(str, enum.Enum):
    """certification_check adds not_applicable per PRD §16."""
    pass_ = "pass"
    fail = "fail"
    needs_clarification = "needs_clarification"
    not_applicable = "not_applicable"


class PanGstEnum(str, enum.Enum):
    """pan_gst_present is pass/fail only per PRD §16 (no needs_clarification)."""
    pass_ = "pass"
    fail = "fail"


class OverallEligibilityEnum(str, enum.Enum):
    eligible = "eligible"
    not_eligible = "not_eligible"
    needs_clarification = "needs_clarification"


class ChecklistStatusEnum(str, enum.Enum):
    pending = "pending"
    uploaded = "uploaded"
    verified = "verified"
    rejected = "rejected"


class RiskLevelEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class RiskStageEnum(str, enum.Enum):
    preliminary = "preliminary"
    final = "final"


class MilestoneTypeEnum(str, enum.Enum):
    deployment = "deployment"
    field_testing = "field_testing"
    outcome_measurement = "outcome_measurement"
    independent_verification = "independent_verification"
    final_decision = "final_decision"


class MilestoneStatusEnum(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    submitted = "submitted"
    accepted = "accepted"
    rejected = "rejected"


class PaymentStatusEnum(str, enum.Enum):
    not_due = "not_due"
    due = "due"
    paid = "paid"


class EvidenceSourceEnum(str, enum.Enum):
    startup_submitted = "startup_submitted"
    govt_data = "govt_data"
    field_visit = "field_visit"


class VerificationModeEnum(str, enum.Enum):
    desk_review = "desk_review"
    field_visit = "field_visit"


class KPIVerdictResultEnum(str, enum.Enum):
    met = "met"
    not_met = "not_met"


class SandboxCheckEnum(str, enum.Enum):
    pass_ = "pass"
    fail = "fail"


class SandboxVerdictEnum(str, enum.Enum):
    promising = "promising"
    not_promising = "not_promising"
    inconclusive = "inconclusive"


class PilotOutcomeResultEnum(str, enum.Enum):
    scale = "scale"
    iterate = "iterate"
    stop = "stop"


# ============================================================
# LAYER 1 — ACTORS
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    startup_profile = relationship(
        "StartupProfile", back_populates="user", uselist=False,
        foreign_keys="StartupProfile.user_id",
    )


class StartupProfile(Base):
    __tablename__ = "startup_profiles"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)

    # Level 1
    entity_type = Column(String, nullable=True)
    dpiit_number = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    gst = Column(String, nullable=True)
    address = Column(String, nullable=True)
    website = Column(String, nullable=True)
    stage = Column(String, nullable=True)
    sector_tags = Column(JSON, nullable=True)  # array

    # Level 2
    team_headcount = Column(Integer, nullable=True)
    tech_stack = Column(JSON, nullable=True)
    trl_stage = Column(String, nullable=True)
    architecture = Column(String, nullable=True)
    api_available = Column(Boolean, nullable=True)
    past_deployments = Column(JSON, nullable=True)
    funding_band = Column(String, nullable=True)  # risk-input ONLY, never eligibility/scoring
    description = Column(Text, nullable=True)  # feeds semantic matching (Doc B Layer1 #4)

    # Compliance — single pass, at registration, manual (§5.1)
    dpiit_status = Column(Enum(DpiitStatusEnum), nullable=False, default=DpiitStatusEnum.unverified)
    entity_verified = Column(Boolean, nullable=False, default=False)
    pan_verified = Column(Boolean, nullable=False, default=False)
    gst_verified = Column(Boolean, nullable=False, default=False)
    compliance_verified_at = Column(DateTime(timezone=True), nullable=True)
    compliance_verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="startup_profile", foreign_keys=[user_id])


# ============================================================
# LAYER 2 — PROBLEM STATEMENT
# ============================================================

class ProblemStatement(Base):
    __tablename__ = "problem_statements"

    id = Column(Integer, primary_key=True)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(CategoryEnum), nullable=False)
    target_beneficiaries = Column(String, nullable=True)
    baseline = Column(String, nullable=True)  # required non-null before publish (Quality Gate)
    target = Column(String, nullable=True)
    measurement_method = Column(String, nullable=True)  # required non-null before publish
    measurement_period = Column(String, nullable=True)
    budget_range = Column(String, nullable=True)
    sensitivity_flags = Column(JSON, nullable=True)  # array/tag
    success_condition = Column(String, nullable=True)
    status = Column(Enum(PSStatusEnum), nullable=False, default=PSStatusEnum.draft)
    additional_required_documents = Column(JSON, nullable=True)  # array
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)
    commercial_unlocked_at = Column(DateTime(timezone=True), nullable=True)  # PS-wide gate (Doc B Stage 4)


# ============================================================
# LAYER 3 — APPLICATION
# ============================================================

class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("problem_statement_id", "startup_id", name="uq_application_ps_startup"),
    )

    id = Column(Integer, primary_key=True)
    problem_statement_id = Column(Integer, ForeignKey("problem_statements.id"), nullable=False)
    startup_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    technical_proposal = Column(JSON, nullable=True)
    commercial_proposal = Column(JSON, nullable=True)
    status = Column(
        Enum(ApplicationStatusEnum), nullable=False, default=ApplicationStatusEnum.applied
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ============================================================
# LAYER 4 — EVALUATION PIPELINE
# ============================================================

class EligibilityCheck(Base):
    __tablename__ = "eligibility_checks"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True)

    # Snapshot copies of StartupProfile at check time (§5.1) — never re-verified live
    dpiit_verified = Column(Enum(PassFailNCEnum), nullable=True)
    entity_valid = Column(Enum(PassFailNCEnum), nullable=True)
    pan_gst_present = Column(Enum(PanGstEnum), nullable=True)

    # Genuinely per-application checks
    certification_check = Column(Enum(CertificationCheckEnum), nullable=True)
    sector_eligible = Column(Enum(PassFailNCEnum), nullable=True)

    overall_result = Column(Enum(OverallEligibilityEnum), nullable=True)
    # setting this to `eligible` auto-opens Stage 2 (service-layer side effect,
    # not a DB trigger) and auto-flips Application.status -> under_evaluation

    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Officer (Doc B Layer3 #2)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChecklistRule(Base):
    __tablename__ = "checklist_rules"

    id = Column(Integer, primary_key=True)
    category = Column(Enum(CategoryEnum), nullable=True)  # null = applies to all categories
    sensitivity_tag = Column(String, nullable=True)  # matched against PS.sensitivity_flags
    document_name = Column(String, nullable=False)


class ChecklistItem(Base):
    """One per required document PER APPLICATION (re-collected every application, Doc B Stage1 #2)."""
    __tablename__ = "checklist_items"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    document_name = Column(String, nullable=False)
    status = Column(Enum(ChecklistStatusEnum), nullable=False, default=ChecklistStatusEnum.pending)
    file_reference = Column(String, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class PSEvaluatorAssignment(Base):
    """Also used for COI-recusal manual replacement (Doc B Stage2 #6)."""
    __tablename__ = "ps_evaluator_assignments"
    __table_args__ = (
        UniqueConstraint("problem_statement_id", "evaluator_id", name="uq_ps_evaluator"),
    )

    id = Column(Integer, primary_key=True)
    problem_statement_id = Column(Integer, ForeignKey("problem_statements.id"), nullable=False)
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # role='admin'
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())


class RubricCriterion(Base):
    """Seeded once as 7 platform-wide rows (category=null) per §7.2 weights."""
    __tablename__ = "rubric_criteria"

    id = Column(Integer, primary_key=True)
    category = Column(Enum(CategoryEnum), nullable=True)  # null = platform-wide default
    name = Column(String, nullable=False)
    weight = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EvaluationScore(Base):
    __tablename__ = "evaluation_scores"
    __table_args__ = (
        UniqueConstraint(
            "application_id", "evaluator_id", "criterion_id", name="uq_score_app_eval_criterion"
        ),
    )

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    criterion_id = Column(Integer, ForeignKey("rubric_criteria.id"), nullable=False)
    score = Column(Numeric, nullable=False)  # 0-100
    justification = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class COIDeclaration(Base):
    """One per (application, evaluator) pair — insert-only, no resubmission allowed
    (Q3 locked decision: mirrors scoring_service.py's existing insert-only pattern)."""
    __tablename__ = "coi_declarations"
    __table_args__ = (
        UniqueConstraint("application_id", "evaluator_id", name="uq_coi_app_eval"),
    )

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    declared_conflict = Column(Boolean, nullable=False, default=False)
    recused = Column(Boolean, nullable=False, default=False)  # auto-true if declared_conflict
    declared_at = Column(DateTime(timezone=True), server_default=func.now())


class RiskProfile(Base):
    """Two rows over time (preliminary/final) — not mutated (PRD §16)."""
    __tablename__ = "risk_profiles"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    technical_risk = Column(Enum(RiskLevelEnum), nullable=False)
    financial_risk = Column(Enum(RiskLevelEnum), nullable=False)
    implementation_risk = Column(Enum(RiskLevelEnum), nullable=False)
    cybersecurity_risk = Column(Enum(RiskLevelEnum), nullable=False)
    data_risk = Column(Enum(RiskLevelEnum), nullable=False)
    scalability_risk = Column(Enum(RiskLevelEnum), nullable=False)
    overall_risk = Column(Enum(RiskLevelEnum), nullable=False)
    stage = Column(Enum(RiskStageEnum), nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


class ContainmentPlan(Base):
    __tablename__ = "containment_plans"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True)
    max_scope = Column(Text, nullable=True)
    max_financial_exposure = Column(String, nullable=True)
    fallback_process = Column(Text, nullable=True)
    data_terms = Column(Text, nullable=True)
    exit_conditions = Column(Text, nullable=True)
    support_obligations = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SelectionDecision(Base):
    """Only one per problem_statement_id — enforced at service layer, not a DB constraint
    (Doc B Stage6 #4)."""
    __tablename__ = "selection_decisions"

    id = Column(Integer, primary_key=True)
    problem_statement_id = Column(Integer, ForeignKey("problem_statements.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)  # the selected one
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decided_at = Column(DateTime(timezone=True), server_default=func.now())


# ============================================================
# LAYER 5 — POST-SELECTION PIPELINE (teammate-owned; included here
# only because the team decided on one shared models.py)
# ============================================================

class SandboxTrial(Base):
    __tablename__ = "sandbox_trials"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True)
    functional_check = Column(Enum(SandboxCheckEnum), nullable=True)
    directional_kpi_check = Column(Enum(SandboxCheckEnum), nullable=True)
    operational_fit_check = Column(Enum(SandboxCheckEnum), nullable=True)
    no_red_flags_check = Column(Enum(SandboxCheckEnum), nullable=True)
    verdict = Column(Enum(SandboxVerdictEnum), nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # role='independent_evaluator'
    verification_mode = Column(Enum(VerificationModeEnum), nullable=True)
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True)
    clause_snapshot = Column(JSON, nullable=False)  # frozen at creation, not a live FK
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # role='officer'
    signed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PilotMilestone(Base):
    __tablename__ = "pilot_milestones"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    milestone_type = Column(Enum(MilestoneTypeEnum), nullable=False)
    display_name = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(Enum(MilestoneStatusEnum), nullable=False, default=MilestoneStatusEnum.pending)
    payment_status = Column(Enum(PaymentStatusEnum), nullable=False, default=PaymentStatusEnum.not_due)
    target_value = Column(String, nullable=True)  # e.g. "95" for M2 uptime threshold
    target_unit = Column(String, nullable=True)  # e.g. "%", "days", "count"
    submitted_value = Column(String, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True)
    milestone_id = Column(Integer, ForeignKey("pilot_milestones.id"), nullable=False)
    source_tag = Column(Enum(EvidenceSourceEnum), nullable=False)
    file_reference = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())


class KPI(Base):
    __tablename__ = "kpis"

    id = Column(Integer, primary_key=True)
    problem_statement_id = Column(Integer, ForeignKey("problem_statements.id"), nullable=False)
    name = Column(String, nullable=False)
    baseline = Column(String, nullable=True)
    target = Column(String, nullable=True)
    measurement_method = Column(String, nullable=True)


class KPIVerdict(Base):
    __tablename__ = "kpi_verdicts"

    id = Column(Integer, primary_key=True)
    kpi_id = Column(Integer, ForeignKey("kpis.id"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    verdict = Column(Enum(KPIVerdictResultEnum), nullable=False)
    verification_mode = Column(Enum(VerificationModeEnum), nullable=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # role=independent_evaluator
    justification = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), server_default=func.now())


class PilotOutcome(Base):
    __tablename__ = "pilot_outcomes"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, unique=True)
    overall_result = Column(Enum(PilotOutcomeResultEnum), nullable=False)
    rationale = Column(Text, nullable=True)
    decided_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # role=officer
    decided_at = Column(DateTime(timezone=True), server_default=func.now())


# ============================================================
# CROSS-CUTTING LAYER
# ============================================================

class AuditLog(Base):
    """Append-only. No update/delete at the app layer — insert-only by design."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g. ps_published, application_submitted, score_recorded
    entity_type = Column(String, nullable=False)  # e.g. "ProblemStatement", "Application"
    entity_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    log_metadata = Column(JSON, nullable=True)  # `metadata` is reserved on Base; mapped as log_metadata


class Invite(Base):
    """Pure event log for startup_invited. No status column, no uniqueness constraint
    (duplicate invites allowed — Doc C Invite #1)."""
    __tablename__ = "invites"

    id = Column(Integer, primary_key=True)
    problem_statement_id = Column(Integer, ForeignKey("problem_statements.id"), nullable=False)
    startup_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())


class ComplianceRecord(Base):
    """Each generation creates a new immutable row — never overwrites a prior snapshot
    (Doc C ComplianceRecord #3)."""
    __tablename__ = "compliance_records"

    id = Column(Integer, primary_key=True)
    problem_statement_id = Column(Integer, ForeignKey("problem_statements.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)  # nullable: PS-wide records (not modeled in MVP, but column allows it)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # role='admin'
    snapshot = Column(JSON, nullable=False)
