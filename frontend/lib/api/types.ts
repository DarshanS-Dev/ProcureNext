import type {
  ApplicationStatus,
  ArchitectureTag,
  BudgetRange,
  Category,
  CertificationCheck,
  ChecklistStatus,
  DpiitStatus,
  EvidenceSource,
  FundingBand,
  KPIVerdictResult,
  MilestoneStatus,
  MilestoneType,
  OverallEligibility,
  PanGst,
  PassFailNC,
  PaymentStatus,
  PilotOutcomeResult,
  PSStatus,
  RiskLevel,
  RiskStage,
  Role,
  SandboxCheck,
  SandboxVerdict,
  VerificationMode,
} from "./enums";

// ============================================================
// LAYER 1 — ACTORS
// ============================================================

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  role?: Role | null;
}

export interface UserRead {
  id: number;
  email: string;
  name: string;
  role: Role;
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
  trl_stage?: number | null;
  architecture?: ArchitectureTag[] | null;
  api_available?: boolean | null;
  past_deployments?: any[] | null;
  funding_band?: FundingBand | null;
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
  architecture?: ArchitectureTag[] | null;
  api_available?: boolean | null;
  past_deployments?: any[] | null;
  funding_band?: FundingBand | null;
  description?: string | null;
  dpiit_status: DpiitStatus;
  entity_verified: boolean;
  pan_verified: boolean;
  gst_verified: boolean;
  compliance_verified_at?: string | null;
  compliance_verified_by?: number | null;
}

export interface StartupProfileMergedRead {
  id: number;
  email: string;
  name: string;
  role: Role;
  created_at: string;
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
  architecture?: ArchitectureTag[] | null;
  api_available?: boolean | null;
  past_deployments?: any[] | null;
  funding_band?: FundingBand | null;
  description?: string | null;
  dpiit_status: DpiitStatus;
  entity_verified: boolean;
  pan_verified: boolean;
  gst_verified: boolean;
  compliance_verified_at?: string | null;
  compliance_verified_by?: number | null;
}

export interface ComplianceVerificationRequest {
  dpiit_status: DpiitStatus;
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
  category: Category;
  target_beneficiaries?: string | null;
  baseline?: string | null;
  target?: string | null;
  measurement_method?: string | null;
  measurement_period?: string | null;
  budget_range?: BudgetRange | null;
  budget_description?: string | null;
  sensitivity_flags?: string[] | null;
  success_condition?: string | null;
  additional_required_documents?: string[] | null;
}

export interface ProblemStatementCreate extends ProblemStatementBase {}

export interface ProblemStatementRead extends ProblemStatementBase {
  id: number;
  officer_id: number;
  status: PSStatus;
  created_at: string;
  published_at?: string | null;
  commercial_unlocked_at?: string | null;
  is_locked_field_editable: boolean;
}

export interface ProblemStatementUpdate {
  title?: string | null;
  description?: string | null;
  category?: Category | null;
  target_beneficiaries?: string | null;
  baseline?: string | null;
  target?: string | null;
  measurement_method?: string | null;
  measurement_period?: string | null;
  budget_range?: BudgetRange | null;
  budget_description?: string | null;
  sensitivity_flags?: string[] | null;
  success_condition?: string | null;
  additional_required_documents?: string[] | null;
}

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

export interface ApplicationCreate {
  problem_statement_id: number;
  technical_proposal?: Record<string, any> | null;
  commercial_proposal?: Record<string, any> | null;
}

export interface ApplicationRead {
  id: number;
  problem_statement_id: number;
  startup_id: number;
  technical_proposal?: Record<string, any> | null;
  commercial_proposal?: Record<string, any> | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface EligibilityCheckRead {
  id: number;
  application_id: number;
  dpiit_verified?: PassFailNC | null;
  entity_valid?: PassFailNC | null;
  pan_gst_present?: PanGst | null;
  certification_check?: CertificationCheck | null;
  sector_eligible?: PassFailNC | null;
  overall_result?: OverallEligibility | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface EligibilityCheckReviewUpdate {
  sector_eligible?: PassFailNC | null;
  certification_check?: CertificationCheck | null;
}

export interface SelectionDecisionCreate {}

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
  status: ChecklistStatus;
  file_reference?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
}

export interface ChecklistItemUploadUpdate {
  file_reference: string;
}

export interface ChecklistItemReviewUpdate {
  status: ChecklistStatus;
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
  category?: Category | null;
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
  technical_risk: RiskLevel;
  financial_risk: RiskLevel;
  implementation_risk: RiskLevel;
  cybersecurity_risk: RiskLevel;
  data_risk: RiskLevel;
  scalability_risk: RiskLevel;
  overall_risk: RiskLevel;
  stage: RiskStage;
  computed_at: string;
}

export interface ContainmentPlanAiAssistRequest {}

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

export interface ContainmentPlanRead {
  id: number;
  application_id: number;
  max_scope?: string | null;
  max_financial_exposure?: string | null;
  fallback_process?: string | null;
  data_terms?: string | null;
  exit_conditions?: string | null;
  support_obligations?: string | null;
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
// AUDIT LOG
// ============================================================

export interface AuditLogRead {
  id: number;
  actor_id?: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  timestamp: string;
  log_metadata?: Record<string, any> | null;
}

// ============================================================
// SEMANTIC MATCHING
// ============================================================

export interface ProblemStatementMatchRead extends ProblemStatementBase {
  id: number;
  officer_id: number;
  status: PSStatus;
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
// LAYER 5 — EXECUTION
// ============================================================

export interface SandboxTrialCreate {
  functional_check: SandboxCheck;
  directional_kpi_check: SandboxCheck;
  operational_fit_check: SandboxCheck;
  no_red_flags_check: SandboxCheck;
  verification_mode: VerificationMode;
  notes?: string | null;
}

export interface SandboxTrialUpdate {
  verdict?: SandboxVerdict | null;
  notes?: string | null;
}

export interface SandboxTrialRead {
  id: number;
  application_id: number;
  functional_check?: SandboxCheck | null;
  directional_kpi_check?: SandboxCheck | null;
  operational_fit_check?: SandboxCheck | null;
  no_red_flags_check?: SandboxCheck | null;
  verdict?: SandboxVerdict | null;
  verified_by?: number | null;
  verification_mode?: VerificationMode | null;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ContractCreate {}

export interface ContractRead {
  id: number;
  application_id: number;
  clause_snapshot: Record<string, any>;
  initiated_by: number;
  signed_at?: string | null;
  created_at: string;
}

export interface PilotMilestoneRead {
  id: number;
  contract_id: number;
  milestone_type: MilestoneType;
  display_name?: string | null;
  due_date?: string | null;
  status: MilestoneStatus;
  payment_status: PaymentStatus;
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
  source_tag: EvidenceSource;
  file_reference?: string | null;
  submitted_at: string;
}

export interface MilestoneReviewUpdate {
  status: MilestoneStatus;
  payment_status: PaymentStatus;
}

export interface KPIVerdictCreate {
  kpi_id: number;
  verdict: KPIVerdictResult;
  verification_mode: VerificationMode;
  justification?: string | null;
}

export interface KPIVerdictRead {
  id: number;
  kpi_id: number;
  contract_id: number;
  verdict: KPIVerdictResult;
  verification_mode: VerificationMode;
  verified_by: number;
  justification?: string | null;
  verified_at: string;
}

export interface PilotOutcomeCreate {
  overall_result: PilotOutcomeResult;
  rationale?: string | null;
}

export interface PilotOutcomeRead {
  id: number;
  contract_id: number;
  overall_result: PilotOutcomeResult;
  rationale?: string | null;
  decided_by: number;
  decided_at: string;
}

export interface InviteCreate {
  startup_id: number;
}

export interface InviteRead {
  id: number;
  problem_statement_id: number;
  startup_id: number;
  invited_at: string;
}

export interface InviteWithConversionRead {
  id: number;
  problem_statement_id: number;
  startup_id: number;
  invited_at: string;
  converted: boolean;
}

export interface ComplianceRecordRead {
  id: number;
  problem_statement_id: number;
  application_id?: number | null;
  generated_at: string;
  generated_by: number;
  snapshot: Record<string, any>;
}
