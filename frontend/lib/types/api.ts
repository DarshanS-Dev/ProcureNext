// Layer 1 Pydantic Mirrors
export type UserRole = 'startup' | 'officer' | 'evaluator' | 'independent-evaluator' | 'admin';

export const UserRole = {
  STARTUP: 'startup' as UserRole,
  NODAL_OFFICER: 'officer' as UserRole,
  EVALUATOR: 'evaluator' as UserRole,
  INDEPENDENT_EVALUATOR: 'independent-evaluator' as UserRole,
  ADMIN: 'admin' as UserRole,
};

export interface UserCreate {
  email: string;
  role: UserRole;
  full_name: string;
  organization_name?: string;
}

export interface UserRead {
  id: number;
  email: string;
  role: UserRole;
  full_name: string;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  role?: UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserRead;
}

export interface StartupProfileLevel1Update {
  company_name: string;
  dpiit_number?: string;
  incorporation_date?: string;
  website_url?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
}

export interface StartupProfileLevel2Update {
  founding_team_summary?: string;
  technical_capabilities?: string;
  past_deployments_summary?: string;
  funding_band?: string; // Risk-input only, never touches eligibility/scoring
  compliance_declarations?: Record<string, boolean>;
}

export interface StartupProfileRead {
  user_id: number;
  level1: StartupProfileLevel1Update;
  level2?: StartupProfileLevel2Update;
  compliance_status: 'unverified' | 'verified' | 'flagged';
  verified_at?: string;
  verified_by?: number;
}

export interface StartupProfileMergedRead extends StartupProfileRead {
  merged_at: string;
}

export interface ComplianceVerificationRequest {
  status: 'verified' | 'flagged';
  verification_notes?: string;
}

// Layer 2 Pydantic Mirrors
export interface ProblemStatementBase {
  title: string;
  domain: string;
  description: string;
  target_outcomes: string;
  budget_allocated: number;
  submission_deadline: string;
}

export interface ProblemStatementCreate extends ProblemStatementBase {}

export interface ProblemStatementUpdate extends Partial<ProblemStatementBase> {}

export interface ProblemStatementRead extends ProblemStatementBase {
  id: number;
  created_by: number;
  status: 'draft' | 'published' | 'closed';
  published_at?: string;
  is_locked_field_editable: boolean;
  kpis?: KPIRead[];
  created_at: string;
}

export interface ProblemStatementAiAssistRequest {
  raw_draft: string;
  domain: string;
}

export interface ProblemStatementAiAssistResponse {
  suggested_title: string;
  refined_description: string;
  suggested_target_outcomes: string;
  suggested_kpis: { title: string; target_value: string; unit: string }[];
  advisory_notice?: string;
}

export interface KPICreate {
  problem_statement_id: number;
  metric_name: string;
  target_value: number;
  unit: string;
  verification_method?: string;
}

export interface KPIRead extends KPICreate {
  id: number;
  created_at: string;
}

// Layer 3 Pydantic Mirrors
export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'under_evaluation'
  | 'selected'
  | 'contracted'
  | 'completed'
  | 'not_selected';

export interface ApplicationCreate {
  problem_statement_id: number;
  proposal_title: string;
  technical_proposal_summary: string;
  commercial_bid_amount: number;
  implementation_timeline_weeks: number;
}

export interface ApplicationRead {
  id: number;
  problem_statement_id: number;
  startup_user_id: number;
  proposal_title: string;
  technical_proposal_summary: string;
  commercial_bid_amount: number;
  implementation_timeline_weeks: number;
  status: ApplicationStatus;
  commercial_unlocked_at?: string;
  applied_at: string;
  rejection_reason?: string;
}

export interface EligibilityCheckRead {
  application_id: number;
  dpiit_verified: boolean;
  entity_valid: boolean;
  pan_gst_present: boolean;
  overall_result: 'pass' | 'fail' | 'needs_clarification';
  reviewed_by?: number;
  reviewed_at?: string;
  notes?: string;
}

export interface EligibilityCheckReviewUpdate {
  overall_result: 'pass' | 'fail' | 'needs_clarification';
  notes?: string;
}

export interface SelectionDecisionCreate {
  selected_application_id: number;
  selection_justification: string;
}

export interface SelectionDecisionRead extends SelectionDecisionCreate {
  id: number;
  decided_by: number;
  decided_at: string;
}

// Layer 4 Pydantic Mirrors
export interface ChecklistItemRead {
  id: number;
  application_id: number;
  title: string;
  category: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  file_url?: string;
  review_notes?: string;
}

export interface ChecklistItemUploadUpdate {
  file_url: string;
}

export interface ChecklistItemReviewUpdate {
  status: 'approved' | 'rejected';
  review_notes?: string;
}

export interface PSEvaluatorAssignmentCreate {
  problem_statement_id: number;
  evaluator_user_id: number;
}

export interface PSEvaluatorAssignmentReplaceRequest {
  new_evaluator_id: number;
  old_evaluator_id: number;
  recused_application_id: number;
  reason: string;
}

export interface PSEvaluatorAssignmentRead {
  id: number;
  problem_statement_id: number;
  evaluator_user_id: number;
  evaluator_name: string;
  assigned_at: string;
}

export interface COIDeclarationCreate {
  application_id: number;
  has_conflict: boolean;
  conflict_details?: string;
}

export interface COIDeclarationRead extends COIDeclarationCreate {
  id: number;
  evaluator_id: number;
  declared_at: string;
  status: 'cleared' | 'recused';
}

export interface RubricCriterionRead {
  id: number;
  code: string;
  title: string;
  max_points: number;
  description: string;
}

export interface EvaluationScoreEntry {
  criterion_id: number;
  score: number;
  comments?: string;
}

export interface EvaluationScoreCreate {
  application_id: number;
  scores: EvaluationScoreEntry[];
}

export interface EvaluationScoreRead {
  id: number;
  application_id: number;
  evaluator_id: number;
  evaluator_name: string;
  scores: EvaluationScoreEntry[];
  total_score: number;
  submitted_at: string;
}

export interface ScoreCompletenessRead {
  complete: boolean;
  pending_evaluator_ids: number[];
  pending_evaluator_names?: string[];
  total_assigned: number;
  total_submitted: number;
}

export interface QCBSScoreRead {
  application_id: number;
  technical_score: number; // 70% weight
  commercial_score: number; // 30% weight
  final_score: number;
  rank?: number;
}

export interface QCBSRankingEntry {
  application_id: number;
  proposal_title: string;
  startup_name: string;
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
  application_id: number;
  financial_risk_score: 'low' | 'medium' | 'high';
  technical_feasibility_risk: 'low' | 'medium' | 'high';
  regulatory_risk: 'low' | 'medium' | 'high';
  overall_risk_rating: 'low' | 'medium' | 'high';
  summary_notes: string;
}

export interface ContainmentPlanAiAssistRequest {
  application_id: number;
  risk_profile_id: number;
}

export interface ContainmentPlanAiAssistResponse {
  suggested_milestones: { title: string; condition: string; penalty_clause: string }[];
  suggested_governance_terms: string;
}

export interface ContainmentPlanCreate {
  application_id: number;
  milestone_conditions: string[];
  penalty_clauses: string;
  special_terms?: string;
}

export interface ContainmentPlanRead extends ContainmentPlanCreate {
  id: number;
  created_at: string;
  updated_at?: string;
}

export interface DecisionReadinessRead {
  application_id: number;
  eligibility_passed: boolean;
  checklist_complete: boolean;
  coi_resolved: boolean;
  scores_complete: boolean;
  risk_profile_assessed: boolean;
  containment_plan_attached: boolean;
  overall_ready: boolean;
  blocking_reasons: string[];
}

// Layer 5 / Sandbox & KPI Mirrors
export interface SandboxTrialRead {
  id: number;
  application_id: number;
  trial_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  environment_url?: string;
  notes?: string;
}

export interface ContractRead {
  id: number;
  application_id: number;
  startup_name: string;
  problem_statement_title: string;
  contract_value: number;
  signed_at: string;
  status: 'active' | 'completed' | 'terminated';
}

export interface MilestoneRead {
  id: number;
  contract_id: number;
  title: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  evidence_url?: string;
  review_notes?: string;
}

export interface KPIVerdictRead {
  id: number;
  contract_id: number;
  kpi_id: number;
  metric_name: string;
  target_value: number;
  submitted_value: number;
  unit: string;
  verdict: 'exceeded' | 'met' | 'partially_met' | 'unmet' | 'promising';
  remarks?: string;
}

export interface PilotOutcomeRead {
  id: number;
  contract_id: number;
  decision: 'scale' | 'iterate' | 'stop';
  recommendation_notes: string;
  verdict_summary: string;
  recorded_at: string;
}

// Audit Trail
export interface AuditLogRead {
  id: number;
  timestamp: string;
  actor_id: number;
  actor_name: string;
  actor_role: UserRole;
  action: string;
  entity_type: string;
  entity_id: number;
  details?: string;
}
