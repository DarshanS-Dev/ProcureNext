import {
  mockUsers, mockStartups, mockProblemStatements, mockApplications,
  mockEligibility, mockChecklistItems, mockEvaluatorAssignments, mockCOIDeclarations,
  mockScores, mockQCBSScore, mockQCBSRankings, mockRiskProfile, mockContainmentPlan,
  mockDecisionReadiness, mockContract, mockMilestones, mockKPIVerdicts,
  mockPilotOutcome, mockAuditLogs
} from './mockData';
import {
  ProblemStatementRead, ApplicationRead, EligibilityCheckRead, ChecklistItemRead,
  COIDeclarationRead, EvaluationScoreRead, ScoreCompletenessRead, QCBSScoreRead,
  QCBSRankingRead, RiskProfileRead, ContainmentPlanRead, DecisionReadinessRead,
  KPIRead, KPIVerdictRead, ContractRead, MilestoneRead, PilotOutcomeRead,
  AuditLogRead, PSEvaluatorAssignmentRead, StartupProfileMergedRead, UserRead
} from '@/lib/types/api';

export const api = {
  // Auth & Users
  getUsers: async (): Promise<UserRead[]> => mockUsers,
  
  // Startups
  getStartupProfile: async (userId?: number): Promise<StartupProfileMergedRead> => {
    return mockStartups[0];
  },
  verifyStartupCompliance: async (userId: number, status: 'verified' | 'flagged') => {
    const startup = mockStartups.find(s => s.user_id === userId);
    if (startup) startup.compliance_status = status;
    return startup;
  },

  // Problem Statements & KPIs (Moved KPI create/read here per v2)
  getProblemStatements: async (): Promise<ProblemStatementRead[]> => mockProblemStatements,
  getProblemStatementById: async (id: number): Promise<ProblemStatementRead | undefined> => {
    return mockProblemStatements.find(p => p.id === id);
  },
  createKPI: async (kpi: Omit<KPIRead, 'id' | 'created_at'>): Promise<KPIRead> => {
    const newKpi: KPIRead = { ...kpi, id: Date.now(), created_at: new Date().toISOString() };
    const ps = mockProblemStatements.find(p => p.id === kpi.problem_statement_id);
    if (ps) {
      ps.kpis = ps.kpis || [];
      ps.kpis.push(newKpi);
    }
    return newKpi;
  },
  getKPIsForPS: async (psId: number): Promise<KPIRead[]> => {
    const ps = mockProblemStatements.find(p => p.id === psId);
    return ps?.kpis || [];
  },

  // Applications
  getApplications: async (): Promise<ApplicationRead[]> => mockApplications,
  
  // FIX #1: IE is authorized for GET /applications/{id} in frontend mock layer (or composed fallback)
  getApplicationById: async (id: number, userRole?: string): Promise<ApplicationRead | undefined> => {
    // IE is explicitly supported in our frontend client layer
    return mockApplications.find(a => a.id === id);
  },

  // FIX #1 (V2 Wirings): Eligibility Check trio + Decision Readiness GET
  getEligibilityCheck: async (appId: number): Promise<EligibilityCheckRead> => mockEligibility,
  updateEligibilityCheck: async (appId: number, update: { overall_result: 'pass' | 'fail' | 'needs_clarification'; notes?: string }) => {
    mockEligibility.overall_result = update.overall_result;
    if (update.notes) mockEligibility.notes = update.notes;
    return mockEligibility;
  },
  getDecisionReadiness: async (appId: number): Promise<DecisionReadinessRead> => mockDecisionReadiness,
  selectStartupForPilot: async (appId: number, justification: string) => {
    const app = mockApplications.find(a => a.id === appId);
    if (app) app.status = 'selected';
    return { success: true, app };
  },

  // Checklist
  getChecklist: async (appId: number): Promise<ChecklistItemRead[]> => mockChecklistItems,
  
  // Evaluators & COI
  getEvaluatorAssignments: async (psId: number): Promise<PSEvaluatorAssignmentRead[]> => mockEvaluatorAssignments,
  declareCOI: async (appId: number, evaluatorId: number, hasConflict: boolean) => {
    const coi = mockCOIDeclarations.find(c => c.application_id === appId && c.evaluator_id === evaluatorId);
    if (coi) {
      coi.has_conflict = hasConflict;
      coi.status = hasConflict ? 'recused' : 'cleared';
    }
    return coi;
  },
  getCOIDeclarations: async (appId: number): Promise<COIDeclarationRead[]> => mockCOIDeclarations,

  // Scoring & QCBS
  getScores: async (appId: number): Promise<EvaluationScoreRead[]> => mockScores,
  getScoreCompleteness: async (appId: number): Promise<ScoreCompletenessRead> => ({
    complete: true,
    pending_evaluator_ids: [],
    pending_evaluator_names: [],
    total_assigned: 2,
    total_submitted: 2,
  }),
  getQCBSScore: async (appId: number): Promise<QCBSScoreRead> => mockQCBSScore,

  // Risk & Containment
  getRiskProfile: async (appId: number): Promise<RiskProfileRead> => mockRiskProfile,
  getContainmentPlan: async (appId: number): Promise<ContainmentPlanRead> => mockContainmentPlan,

  // Sandbox & Contract & Milestones
  getContract: async (appId: number): Promise<ContractRead> => mockContract,
  getMilestones: async (contractId: number): Promise<MilestoneRead[]> => mockMilestones,

  // FIX #2: Narrowed kpi.ts to contracts/{id}/kpi-verdicts ONLY
  getKPIVerdicts: async (contractId: number): Promise<KPIVerdictRead[]> => mockKPIVerdicts,
  submitKPIVerdict: async (contractId: number, verdict: Omit<KPIVerdictRead, 'id'>): Promise<KPIVerdictRead> => {
    const newV: KPIVerdictRead = { ...verdict, id: Date.now() };
    mockKPIVerdicts.push(newV);
    return newV;
  },

  // FIX #2: IE Pilot Outcome view access
  getPilotOutcome: async (contractId: number): Promise<PilotOutcomeRead> => mockPilotOutcome,

  // FIX #3: Admin audit log endpoint definition with query filters
  getAuditLogs: async (params?: { entity_type?: string; entity_id?: number; actor_id?: number }): Promise<AuditLogRead[]> => {
    let result = [...mockAuditLogs];
    if (params?.entity_type) result = result.filter(l => l.entity_type === params.entity_type);
    if (params?.entity_id) result = result.filter(l => l.entity_id === params.entity_id);
    if (params?.actor_id) result = result.filter(l => l.actor_id === params.actor_id);
    return result;
  }
};
