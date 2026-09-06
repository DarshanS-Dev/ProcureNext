/**
 * TypeScript mirrors of the FastAPI schemas.
 *
 * Source of truth:
 *   backend/app/models.py           — enums
 *   backend/app/schemas/core_schemas.py       — Layers 1-4 + AuditLog
 *   backend/app/schemas/execution_schemas.py  — Layer 5 + Invite + ComplianceRecord
 *
 * Rules followed here:
 * - Field names and optionality are copied verbatim from the Pydantic models.
 *   Nothing is invented; if the backend does not return it, it is not here.
 * - Enums are string-literal unions using the backend's *values* (note that
 *   `pass_ = "pass"` serialises as "pass", not "pass_").
 * - `datetime` / `date` arrive as ISO strings over JSON.
 */

// ============================================================
// ENUMS (backend/app/models.py)
// ============================================================

/** RoleEnum. Note the underscore in `independent_evaluator` — this is the
 *  wire value. Route segments use a hyphen; convert with roleToSlug(). */
export type RoleEnum =
  | 'officer'
  | 'startup'
  | 'evaluator'
  | 'independent_evaluator'
  | 'admin';

export const ROLE_VALUES: RoleEnum[] = [
  'officer',
  'startup',
  'evaluator',
  'independent_evaluator',
  'admin',
];

/** URL slug form of a role — `independent_evaluator` -> `independent-evaluator`. */
export type RoleSlug =
  | 'officer'
  | 'startup'
  | 'evaluator'
  | 'independent-evaluator'
  | 'admin';

export const roleToSlug = (role: RoleEnum): RoleSlug =>
  role.replace(/_/g, '-') as RoleSlug;

export const slugToRole = (slug: RoleSlug): RoleEnum =>
  slug.replace(/-/g, '_') as RoleEnum;

/** Alias kept for the design-system components, which key palettes by slug. */
export type UserRole = RoleSlug;

export const UserRole = {
  STARTUP: 'startup' as UserRole,
  NODAL_OFFICER: 'officer' as UserRole,
  EVALUATOR: 'evaluator' as UserRole,
  INDEPENDENT_EVALUATOR: 'independent-evaluator' as UserRole,
  ADMIN: 'admin' as UserRole,
};

export type DpiitStatusEnum = 'unverified' | 'verified' | 'failed';

export type CategoryEnum =
  | 'healthcare'
  | 'sanitation'
  | 'transport'
  | 'education'
  | 'agriculture'
  | 'governance'
  | 'iot_hardware';

export const CATEGORY_VALUES: CategoryEnum[] = [
  'healthcare',
  'sanitation',
  'transport',
  'education',
  'agriculture',
  'governance',
  'iot_hardware',
];

export type PSStatusEnum = 'draft' | 'published' | 'closed';

export type ApplicationStatusEnum =
  | 'applied'
  | 'under_review'
  | 'under_evaluation'
  | 'selected'
  | 'not_selected'
  | 'contracted'
  | 'completed';

/** Legacy alias used by PipelineStepper / DesignSystem. */
export type ApplicationStatus = ApplicationStatusEnum;

export type PassFailNCEnum = 'pass' | 'fail' | 'needs_clarification';

export type CertificationCheckEnum =
  | 'pass'
  | 'fail'
  | 'needs_clarification'
  | 'not_applicable';

export type PanGstEnum = 'pass' | 'fail';

export type OverallEligibilityEnum =
  | 'eligible'
  | 'not_eligible'
  | 'needs_clarification';

export type ChecklistStatusEnum = 'pending' | 'uploaded' | 'verified' | 'rejected';

export type RiskLevelEnum = 'low' | 'medium' | 'high';

export type RiskStageEnum = 'preliminary' | 'final';

export type MilestoneTypeEnum =
  | 'deployment'
  | 'field_testing'
  | 'outcome_measurement'
  | 'independent_verification'
  | 'final_decision';

export type MilestoneStatusEnum =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'accepted'
  | 'rejected';

export type PaymentStatusEnum = 'not_due' | 'due' | 'paid';

export type EvidenceSourceEnum = 'startup_submitted' | 'govt_data' | 'field_visit';

export type VerificationModeEnum = 'desk_review' | 'field_visit';

export type KPIVerdictResultEnum = 'met' | 'not_met';

export type FundingBandEnum =
  | 'bootstrapped'
  | 'pre_seed'
  | 'seed'
  | 'series_a'
  | 'series_b_plus';

export const FUNDING_BAND_VALUES: FundingBandEnum[] = [
  'bootstrapped',
  'pre_seed',
  'seed',
  'series_a',
  'series_b_plus',
];

export type BudgetRangeEnum =
  | 'under_5L'
  | '5L_to_25L'
  | '25L_to_1Cr'
  | 'over_1Cr';

export const BUDGET_RANGE_VALUES: BudgetRangeEnum[] = [
  'under_5L',
  '5L_to_25L',
  '25L_to_1Cr',
  'over_1Cr',
];

export type ArchitectureTagEnum =
  | 'cloud'
  | 'microservices'
  | 'on_premise'
  | 'monolith'
  | 'api_first';

export const ARCHITECTURE_VALUES: ArchitectureTagEnum[] = [
  'cloud',
  'microservices',
  'on_premise',
  'monolith',
  'api_first',
];

export type SandboxCheckEnum = 'pass' | 'fail';

export type SandboxVerdictEnum = 'promising' | 'not_promising' | 'inconclusive';

export type PilotOutcomeResultEnum = 'scale' | 'iterate' | 'stop';

// ============================================================
// LAYER 1 — ACTORS
// ============================================================

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  /** Ignored (forced to 'startup') by POST /auth/register. */
  role?: RoleEnum | null;
}

export interface UserRead {
  id: number;
  email: string;
  name: string;
  role: RoleEnum;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface StartupProfileLevel1Update {
  entity_type?: string | null;
  dpiit_number?: string | null;
  pan?: string | null;
  gst?: string | null;
  address?: string | null;
  website?: string | null;
  stage?: string | null;
  sector_tags?: string[] | null;
}

export interface StartupProfileLevel2Update {
  team_headcount?: number | null;
  tech_stack?: string[] | null;
  /** 1-9, real TRL standard — the service validates the range. */
  trl_stage?: number | null;
  architecture?: ArchitectureTagEnum[] | null;
  api_available?: boolean | null;
  past_deployments?: unknown[] | null;
  funding_band?: FundingBandEnum | null;
  description?: string | null;
}

export interface StartupProfileRead {
  user_id: number;
  entity_type?: string | null;
  dpiit_number?: string | null;
  pan?: string | null;
  gst?: string | null;
  address?: string | null;
  website?: string | null;
  stage?: string | null;
  sector_tags?: string[] | null;
  team_headcount?: number | null;
  tech_stack?: string[] | null;
  trl_stage?: number | null;
  architecture?: ArchitectureTagEnum[] | null;
  api_available?: boolean | null;
  past_deployments?: unknown[] | null;
  funding_band?: FundingBandEnum | null;
  description?: string | null;
  dpiit_status: DpiitStatusEnum;
  entity_verified: boolean;
  pan_verified: boolean;
  gst_verified: boolean;
  compliance_verified_at?: string | null;
  compliance_verified_by?: number | null;
}

/** GET /startup/profile/{user_id} — User fields merged onto the profile. */
export interface StartupProfileMergedRead extends Omit<StartupProfileRead, 'user_id'> {
  id: number;
  email: string;
  name: string;
  role: RoleEnum;
  created_at: string;
}

export interface ComplianceVerificationRequest {
  dpiit_status: DpiitStatusEnum;
  entity_verified: boolean;
  pan_verified: boolean;
  gst_verified: boolean;
}

// ============================================================
// LAYER 2 — PROBLEM STATEMENT
// ============================================================

export interface ProblemStatementBase {
  title: string;
  description?: string | null;
  category: CategoryEnum;
  target_beneficiaries?: string | null;
  baseline?: string | null;
  target?: string | null;
  measurement_method?: string | null;
  measurement_period?: string | null;
  budget_range?: BudgetRangeEnum | null;
  budget_description?: string | null;
  sensitivity_flags?: string[] | null;
  success_condition?: string | null;
  additional_required_documents?: string[] | null;
}

export type ProblemStatementCreate = ProblemStatementBase;

export interface ProblemStatementRead extends ProblemStatementBase {
  id: number;
  officer_id: number;
  status: PSStatusEnum;
  created_at: string;
  published_at?: string | null;
  commercial_unlocked_at?: string | null;
  /** Computed: true when zero Applications exist for this PS. */
  is_locked_field_editable: boolean;
}

export type ProblemStatementUpdate = Partial<ProblemStatementBase>;

export interface ProblemStatementAiAssistRequest {
  rough_text: string;
}

export interface ProblemStatementAiAssistResponse {
  suggested_baseline_question?: string | null;
  suggested_measurement_method?: string | null;
  is_outcome_based: boolean;
  rewrite_suggestion?: string | null;
}

export interface KPICreate {
  name: string;
  baseline?: string | null;
  target?: string | null;
  measurement_method?: string | null;
}

export interface KPIRead {
  id: number;
  problem_statement_id: number;
  name: string;
  baseline?: string | null;
  target?: string | null;
  measurement_method?: string | null;
}

// ============================================================
// LAYER 3 — APPLICATION
// ============================================================

/** The backend accepts two free-form JSON blobs, not flat proposal columns. */
export interface ApplicationCreate {
  problem_statement_id: number;
  technical_proposal?: Record<string, unknown> | null;
  commercial_proposal?: Record<string, unknown> | null;
}

export interface ApplicationRead {
  id: number;
  problem_statement_id: number;
  startup_id: number;
  technical_proposal?: Record<string, unknown> | null;
  commercial_proposal?: Record<string, unknown> | null;
  status: ApplicationStatusEnum;
  created_at: string;
}

export interface EligibilityCheckRead {
  id: number;
  application_id: number;
  dpiit_verified?: PassFailNCEnum | null;
  entity_valid?: PassFailNCEnum | null;
  pan_gst_present?: PanGstEnum | null;
  certification_check?: CertificationCheckEnum | null;
  sector_eligible?: PassFailNCEnum | null;
  overall_result?: OverallEligibilityEnum | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
}

/** PATCH /applications/{id}/eligibility-check — officer sets only these two. */
export interface EligibilityCheckReviewUpdate {
  sector_eligible?: PassFailNCEnum | null;
  certification_check?: CertificationCheckEnum | null;
}

/** POST /applications/{id}/select takes an empty body. */
export type SelectionDecisionCreate = Record<string, never>;

export interface SelectionDecisionRead {
  id: number;
  problem_statement_id: number;
  application_id: number;
  officer_id: number;
  decided_at: string;
}

// ============================================================
// LAYER 4 — EVALUATION PIPELINE
// ============================================================

export interface ChecklistItemRead {
  id: number;
  application_id: number;
  document_name: string;
  status: ChecklistStatusEnum;
  file_reference?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
}

export interface ChecklistItemUploadUpdate {
  file_reference: string;
}

export interface ChecklistItemReviewUpdate {
  /** Expected: verified | rejected. */
  status: ChecklistStatusEnum;
}

export interface PSEvaluatorAssignmentCreate {
  evaluator_id: number;
}

export interface PSEvaluatorAssignmentReplaceRequest {
  new_evaluator_id: number;
  old_evaluator_id: number;
  recused_application_id: number;
}

export interface PSEvaluatorAssignmentRead {
  id: number;
  problem_statement_id: number;
  evaluator_id: number;
  assigned_by: number;
  assigned_at: string;
}

export interface COIDeclarationCreate {
  declared_conflict: boolean;
}

export interface COIDeclarationRead {
  id: number;
  application_id: number;
  evaluator_id: number;
  declared_conflict: boolean;
  recused: boolean;
  declared_at: string;
}

export interface RubricCriterionRead {
  id: number;
  category?: CategoryEnum | null;
  name: string;
  weight: number;
}

export interface EvaluationScoreEntry {
  criterion_id: number;
  score: number;
  justification: string;
}

export interface EvaluationScoreCreate {
  scores: EvaluationScoreEntry[];
}

export interface EvaluationScoreRead {
  id: number;
  application_id: number;
  evaluator_id: number;
  criterion_id: number;
  score: number;
  justification: string;
  created_at: string;
}

export interface ScoreCompletenessRead {
  complete: boolean;
  pending_evaluator_ids: number[];
}

export interface QCBSScoreRead {
  application_id: number;
  technical_score: number;
  commercial_score: number;
  final_score: number;
}

export interface QCBSRankingEntry {
  application_id: number;
  startup_id: number;
  technical_score: number;
  commercial_score: number;
  final_score: number;
  rank: number;
}

export interface QCBSRankingRead {
  problem_statement_id: number;
  rankings: QCBSRankingEntry[];
}

export interface RiskProfileRead {
  id: number;
  application_id: number;
  technical_risk: RiskLevelEnum;
  financial_risk: RiskLevelEnum;
  implementation_risk: RiskLevelEnum;
  cybersecurity_risk: RiskLevelEnum;
  data_risk: RiskLevelEnum;
  scalability_risk: RiskLevelEnum;
  overall_risk: RiskLevelEnum;
  stage: RiskStageEnum;
  computed_at: string;
}

/** POST /applications/{id}/containment-plan/ai-assist takes an empty body. */
export type ContainmentPlanAiAssistRequest = Record<string, never>;

export interface ContainmentPlanAiAssistResponse {
  max_scope?: string | null;
  fallback_process?: string | null;
  data_terms?: string | null;
  exit_conditions?: string | null;
}

export interface ContainmentPlanCreate {
  max_scope?: string | null;
  max_financial_exposure?: string | null;
  fallback_process?: string | null;
  data_terms?: string | null;
  exit_conditions?: string | null;
  support_obligations?: string | null;
}

export interface ContainmentPlanRead extends ContainmentPlanCreate {
  id: number;
  application_id: number;
  created_at: string;
}

export interface DecisionReadinessRead {
  application_id: number;
  eligibility_passed: boolean;
  stage3_scoring_complete: boolean;
  no_unresolved_coi: boolean;
  commercial_unlocked: boolean;
  final_risk_profile_exists: boolean;
  containment_plan_exists: boolean;
  overall_ready: boolean;
}

// ============================================================
// CROSS-CUTTING — AUDIT LOG
// ============================================================

export interface AuditLogRead {
  id: number;
  actor_id?: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  timestamp: string;
  log_metadata?: Record<string, unknown> | null;
}

// ============================================================
// SEMANTIC MATCHING
// ============================================================

export interface ProblemStatementMatchRead extends ProblemStatementBase {
  id: number;
  officer_id: number;
  status: PSStatusEnum;
  created_at: string;
  published_at?: string | null;
  commercial_unlocked_at?: string | null;
  recommended: boolean;
}

export interface StartupMatchEntry {
  startup_id: number;
  name: string;
  rank: number;
  recommended: boolean;
}

export interface PSMatchRankingRead {
  problem_statement_id: number;
  matches: StartupMatchEntry[];
}

// ============================================================
// LAYER 5 — STAGE A: SANDBOX TRIAL
// ============================================================

export interface SandboxTrialCreate {
  functional_check: SandboxCheckEnum;
  directional_kpi_check: SandboxCheckEnum;
  operational_fit_check: SandboxCheckEnum;
  no_red_flags_check: SandboxCheckEnum;
  verification_mode: VerificationModeEnum;
  notes?: string | null;
}

export interface SandboxTrialUpdate {
  /** Omit to let the service compute it from the four checks. */
  verdict?: SandboxVerdictEnum | null;
  notes?: string | null;
}

export interface SandboxTrialRead {
  id: number;
  application_id: number;
  functional_check?: SandboxCheckEnum | null;
  directional_kpi_check?: SandboxCheckEnum | null;
  operational_fit_check?: SandboxCheckEnum | null;
  no_red_flags_check?: SandboxCheckEnum | null;
  verdict?: SandboxVerdictEnum | null;
  verified_by?: number | null;
  verification_mode?: VerificationModeEnum | null;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

// ============================================================
// LAYER 5 — STAGE B: CONTRACT
// ============================================================

/** POST /applications/{id}/contract takes an empty body. */
export type ContractCreate = Record<string, never>;

export interface ContractRead {
  id: number;
  application_id: number;
  clause_snapshot: Record<string, unknown>;
  initiated_by: number;
  signed_at?: string | null;
  created_at: string;
}

// ============================================================
// LAYER 5 — STAGE C: MILESTONE + EVIDENCE
// ============================================================

export interface PilotMilestoneRead {
  id: number;
  contract_id: number;
  milestone_type: MilestoneTypeEnum;
  display_name?: string | null;
  due_date?: string | null;
  status: MilestoneStatusEnum;
  payment_status: PaymentStatusEnum;
  target_value?: string | null;
  target_unit?: string | null;
  submitted_value?: string | null;
  completed_at?: string | null;
}

export interface PilotMilestoneUpdate {
  due_date?: string | null;
  target_value?: string | null;
  target_unit?: string | null;
  display_name?: string | null;
}

export interface EvidenceCreate {
  file_reference: string;
}

export interface EvidenceRead {
  id: number;
  milestone_id: number;
  source_tag: EvidenceSourceEnum;
  file_reference?: string | null;
  submitted_at: string;
}

export interface MilestoneReviewUpdate {
  /** Expected: accepted | rejected. */
  status: MilestoneStatusEnum;
  payment_status: PaymentStatusEnum;
}

/** Aliases kept for existing imports. */
export type MilestoneRead = PilotMilestoneRead;
export type MilestoneUpdate = PilotMilestoneUpdate;

// ============================================================
// LAYER 5 — STAGE D: KPI VERDICT
// ============================================================

export interface KPIVerdictCreate {
  kpi_id: number;
  verdict: KPIVerdictResultEnum;
  verification_mode: VerificationModeEnum;
  justification?: string | null;
}

export interface KPIVerdictRead {
  id: number;
  kpi_id: number;
  contract_id: number;
  verdict: KPIVerdictResultEnum;
  verification_mode: VerificationModeEnum;
  verified_by: number;
  justification?: string | null;
  verified_at: string;
}

// ============================================================
// LAYER 5 — STAGE E: PILOT OUTCOME
// ============================================================

export interface PilotOutcomeCreate {
  overall_result: PilotOutcomeResultEnum;
  rationale?: string | null;
}

export interface PilotOutcomeRead {
  id: number;
  contract_id: number;
  overall_result: PilotOutcomeResultEnum;
  rationale?: string | null;
  decided_by: number;
  decided_at: string;
}

// ============================================================
// INVITE
// ============================================================

export interface InviteCreate {
  startup_id: number;
}

export interface InviteRead {
  id: number;
  problem_statement_id: number;
  startup_id: number;
  invited_at: string;
}

export interface InviteWithConversionRead extends InviteRead {
  /** Computed live: does an Application exist for this (ps, startup) pair? */
  converted: boolean;
}

// ============================================================
// COMPLIANCE RECORD
// ============================================================

export interface ComplianceRecordRead {
  id: number;
  problem_statement_id: number;
  application_id?: number | null;
  generated_at: string;
  generated_by: number;
  snapshot: Record<string, unknown>;
}
