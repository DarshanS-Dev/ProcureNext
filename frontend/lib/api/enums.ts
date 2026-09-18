export type Role =
  | "officer"
  | "startup"
  | "evaluator"
  | "independent_evaluator"
  | "admin";

export type DpiitStatus = "unverified" | "verified" | "failed";

export type Category =
  | "healthcare"
  | "sanitation"
  | "transport"
  | "education"
  | "agriculture"
  | "governance"
  | "iot_hardware";

export const CATEGORY_VALUES: Category[] = [
  "healthcare",
  "sanitation",
  "transport",
  "education",
  "agriculture",
  "governance",
  "iot_hardware",
];

export type PSStatus = "draft" | "published" | "closed";

export type ApplicationStatus =
  | "applied"
  | "under_review"
  | "under_evaluation"
  | "selected"
  | "not_selected"
  | "contracted"
  | "completed";

export type PassFailNC = "pass" | "fail" | "needs_clarification";

export type CertificationCheck =
  | "pass"
  | "fail"
  | "needs_clarification"
  | "not_applicable";

export type PanGst = "pass" | "fail";

export type OverallEligibility =
  | "eligible"
  | "not_eligible"
  | "needs_clarification";

export type ChecklistStatus = "pending" | "uploaded" | "verified" | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export type RiskStage = "preliminary" | "final";

export type MilestoneType =
  | "deployment"
  | "field_testing"
  | "outcome_measurement"
  | "independent_verification"
  | "final_decision";

export type MilestoneStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "accepted"
  | "rejected";

export type PaymentStatus = "not_due" | "due" | "paid";

export type EvidenceSource =
  | "startup_submitted"
  | "govt_data"
  | "field_visit";

export type VerificationMode = "desk_review" | "field_visit";

export type KPIVerdictResult = "met" | "not_met";

export type FundingBand =
  | "bootstrapped"
  | "pre_seed"
  | "seed"
  | "series_a"
  | "series_b_plus";

export const FUNDING_BAND_VALUES: FundingBand[] = [
  "bootstrapped",
  "pre_seed",
  "seed",
  "series_a",
  "series_b_plus",
];

export type BudgetRange =
  | "under_5L"
  | "5L_to_25L"
  | "25L_to_1Cr"
  | "over_1Cr";

export const BUDGET_RANGE_VALUES: BudgetRange[] = [
  "under_5L",
  "5L_to_25L",
  "25L_to_1Cr",
  "over_1Cr",
];

export type ArchitectureTag =
  | "cloud"
  | "microservices"
  | "on_premise"
  | "monolith"
  | "api_first";

export const ARCHITECTURE_VALUES: ArchitectureTag[] = [
  "cloud",
  "microservices",
  "on_premise",
  "monolith",
  "api_first",
];

export type SandboxCheck = "pass" | "fail";

export type SandboxVerdict = "promising" | "not_promising" | "inconclusive";

export type PilotOutcomeResult = "scale" | "iterate" | "stop";
