import {
  ProblemStatementRead, ApplicationRead, EligibilityCheckRead, ChecklistItemRead,
  COIDeclarationRead, EvaluationScoreRead, ScoreCompletenessRead, QCBSScoreRead,
  QCBSRankingRead, RiskProfileRead, ContainmentPlanRead, DecisionReadinessRead,
  KPIRead, KPIVerdictRead, ContractRead, MilestoneRead, PilotOutcomeRead,
  AuditLogRead, PSEvaluatorAssignmentRead, StartupProfileMergedRead, UserRead
} from '@/lib/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`API Error ${res.status} at ${endpoint}: ${errorText}`);
      return [] as unknown as T;
    }

    return await res.json();
  } catch (err) {
    console.warn(`Failed to connect to FastAPI backend at ${API_BASE}${endpoint}. Is backend server running on port 8000?`);
    return [] as unknown as T;
  }
}

export const api = {
  // Auth & Users
  getUsers: async (): Promise<UserRead[]> => {
    return fetchAPI<UserRead[]>('/admin/users');
  },
  
  // Startups
  getStartupProfile: async (userId?: number): Promise<StartupProfileMergedRead> => {
    return fetchAPI<StartupProfileMergedRead>('/startups/profile/merged');
  },
  verifyStartupCompliance: async (userId: number, status: 'verified' | 'flagged') => {
    return fetchAPI<StartupProfileMergedRead>(`/admin/startups/${userId}/compliance`, {
      method: 'POST',
      body: JSON.stringify({ compliance_status: status }),
    });
  },

  // Problem Statements & Semantic Matching
  getProblemStatements: async (): Promise<ProblemStatementRead[]> => {
    return fetchAPI<ProblemStatementRead[]>('/problem-statements');
  },
  getMatchedProblemStatements: async (): Promise<(ProblemStatementRead & { recommended?: boolean; score?: number })[]> => {
    return fetchAPI<(ProblemStatementRead & { recommended?: boolean; score?: number })[]>('/startup/problem-statements');
  },
  getProblemStatementById: async (id: number): Promise<ProblemStatementRead | undefined> => {
    return fetchAPI<ProblemStatementRead>(`/problem-statements/${id}`);
  },
  createKPI: async (kpi: Omit<KPIRead, 'id' | 'created_at'>): Promise<KPIRead> => {
    return fetchAPI<KPIRead>(`/problem-statements/${kpi.problem_statement_id}/kpis`, {
      method: 'POST',
      body: JSON.stringify(kpi),
    });
  },
  getKPIsForPS: async (psId: number): Promise<KPIRead[]> => {
    return fetchAPI<KPIRead[]>(`/problem-statements/${psId}/kpis`);
  },

  // Invites
  getStartupInvites: async (): Promise<any[]> => {
    return fetchAPI<any[]>('/startup/invites');
  },
  sendInvite: async (psId: number, startupId: number) => {
    return fetchAPI<any>(`/problem-statements/${psId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ startup_id: startupId }),
    });
  },

  // Applications
  getApplications: async (): Promise<ApplicationRead[]> => {
    return fetchAPI<ApplicationRead[]>('/applications');
  },
  createApplication: async (payload: { problem_statement_id: number; proposal_title?: string; proposal_summary?: string }): Promise<ApplicationRead> => {
    return fetchAPI<ApplicationRead>('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getApplicationById: async (id: number, userRole?: string): Promise<ApplicationRead | undefined> => {
    return fetchAPI<ApplicationRead>(`/applications/${id}`);
  },

  // Eligibility & Decision Readiness
  getEligibilityCheck: async (appId: number): Promise<EligibilityCheckRead> => {
    return fetchAPI<EligibilityCheckRead>(`/applications/${appId}/eligibility-check`);
  },
  updateEligibilityCheck: async (appId: number, update: { overall_result: 'pass' | 'fail' | 'needs_clarification'; notes?: string }) => {
    return fetchAPI<EligibilityCheckRead>(`/applications/${appId}/eligibility-check`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  },
  getDecisionReadiness: async (appId: number): Promise<DecisionReadinessRead> => {
    return fetchAPI<DecisionReadinessRead>(`/applications/${appId}/decision-readiness`);
  },
  selectStartupForPilot: async (appId: number, justification: string) => {
    return fetchAPI<{ success: boolean; app: ApplicationRead }>(`/applications/${appId}/select-pilot`, {
      method: 'POST',
      body: JSON.stringify({ justification }),
    });
  },

  // Checklist
  getChecklist: async (appId: number): Promise<ChecklistItemRead[]> => {
    return fetchAPI<ChecklistItemRead[]>(`/applications/${appId}/checklist`);
  },
  
  // Evaluators & COI
  getEvaluatorAssignments: async (psId: number): Promise<PSEvaluatorAssignmentRead[]> => {
    return fetchAPI<PSEvaluatorAssignmentRead[]>(`/problem-statements/${psId}/evaluators`);
  },
  declareCOI: async (appId: number, evaluatorId: number, hasConflict: boolean) => {
    return fetchAPI<COIDeclarationRead>(`/applications/${appId}/coi-declaration`, {
      method: 'POST',
      body: JSON.stringify({ declared_conflict: hasConflict }),
    });
  },
  getCOIDeclarations: async (appId: number): Promise<COIDeclarationRead[]> => {
    return fetchAPI<COIDeclarationRead[]>(`/applications/${appId}/coi-declaration`);
  },

  // Scoring & QCBS
  getScores: async (appId: number): Promise<EvaluationScoreRead[]> => {
    return fetchAPI<EvaluationScoreRead[]>(`/applications/${appId}/scores`);
  },
  getScoreCompleteness: async (appId: number): Promise<ScoreCompletenessRead> => {
    return fetchAPI<ScoreCompletenessRead>(`/applications/${appId}/scores/completeness`);
  },
  getQCBSScore: async (appId: number): Promise<QCBSScoreRead> => {
    return fetchAPI<QCBSScoreRead>(`/applications/${appId}/qcbs-score`);
  },

  // Risk & Containment
  getRiskProfile: async (appId: number): Promise<RiskProfileRead> => {
    return fetchAPI<RiskProfileRead>(`/applications/${appId}/risk-profile`);
  },
  getContainmentPlan: async (appId: number): Promise<ContainmentPlanRead> => {
    return fetchAPI<ContainmentPlanRead>(`/applications/${appId}/containment-plan`);
  },

  // Sandbox & Contract & Milestones
  getContract: async (appId: number): Promise<ContractRead> => {
    return fetchAPI<ContractRead>(`/applications/${appId}/contract`);
  },
  getMilestones: async (contractId: number): Promise<MilestoneRead[]> => {
    return fetchAPI<MilestoneRead[]>(`/contracts/${contractId}/milestones`);
  },

  // KPI Verdicts
  getKPIVerdicts: async (contractId: number): Promise<KPIVerdictRead[]> => {
    return fetchAPI<KPIVerdictRead[]>(`/contracts/${contractId}/kpi-verdicts`);
  },
  submitKPIVerdict: async (contractId: number, verdict: Omit<KPIVerdictRead, 'id'>): Promise<KPIVerdictRead> => {
    return fetchAPI<KPIVerdictRead>(`/contracts/${contractId}/kpi-verdicts`, {
      method: 'POST',
      body: JSON.stringify(verdict),
    });
  },

  // Pilot Outcome
  getPilotOutcome: async (contractId: number): Promise<PilotOutcomeRead> => {
    return fetchAPI<PilotOutcomeRead>(`/contracts/${contractId}/pilot-outcome`);
  },

  // Audit Logs
  getAuditLogs: async (params?: { entity_type?: string; entity_id?: number; actor_id?: number }): Promise<AuditLogRead[]> => {
    const query = new URLSearchParams(params as Record<string, string> || {}).toString();
    return fetchAPI<AuditLogRead[]>(`/admin/audit-logs${query ? `?${query}` : ''}`);
  }
};
