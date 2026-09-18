export * from "../api/enums";
export * from "../api/types";

import type {
  Role,
  ApplicationStatus,
  MilestoneType,
  MilestoneStatus,
  CertificationCheck,
  KPIVerdictResult,
  PassFailNC,
  PaymentStatus,
  PilotOutcomeResult,
  RiskLevel,
  SandboxCheck,
  SandboxVerdict,
  VerificationMode,
  ArchitectureTag,
  BudgetRange,
  FundingBand,
  Category,
  PSStatus,
  ChecklistStatus,
  DpiitStatus,
} from "../api/enums";

export type RoleEnum = Role;
export type UserRole = Role;
export type ApplicationStatusEnum = ApplicationStatus;
export type MilestoneTypeEnum = MilestoneType;
export type MilestoneStatusEnum = MilestoneStatus;
export type CertificationCheckEnum = CertificationCheck;
export type KPIVerdictResultEnum = KPIVerdictResult;
export type PassFailNCEnum = PassFailNC;
export type PaymentStatusEnum = PaymentStatus;
export type PilotOutcomeResultEnum = PilotOutcomeResult;
export type RiskLevelEnum = RiskLevel;
export type SandboxCheckEnum = SandboxCheck;
export type SandboxVerdictEnum = SandboxVerdict;
export type VerificationModeEnum = VerificationMode;
export type ArchitectureTagEnum = ArchitectureTag;
export type BudgetRangeEnum = BudgetRange;
export type FundingBandEnum = FundingBand;
export type CategoryEnum = Category;
export type PSStatusEnum = PSStatus;
export type ChecklistStatusEnum = ChecklistStatus;
export type DpiitStatusEnum = DpiitStatus;

export type RoleSlug = "officer" | "startup" | "evaluator" | "independent_evaluator" | "admin";
export function roleToSlug(role: Role): RoleSlug {
  return role as RoleSlug;
}
