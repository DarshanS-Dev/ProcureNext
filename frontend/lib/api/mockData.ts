import {
  UserRead, StartupProfileMergedRead, ProblemStatementRead, ApplicationRead,
  EligibilityCheckRead, ChecklistItemRead, COIDeclarationRead, EvaluationScoreRead,
  ScoreCompletenessRead, QCBSScoreRead, QCBSRankingRead, RiskProfileRead,
  ContainmentPlanRead, DecisionReadinessRead, KPIRead, KPIVerdictRead,
  ContractRead, MilestoneRead, PilotOutcomeRead, AuditLogRead, PSEvaluatorAssignmentRead
} from '@/lib/types/api';

// Initial Mock Data
export const mockUsers: UserRead[] = [
  { id: 1, email: 'tech@promtech.io', role: 'startup', full_name: 'PromTech Solutions', organization_name: 'PromTech Pvt Ltd', is_active: true, created_at: '2024-01-10T10:00:00Z' },
  { id: 2, email: 'officer@defense.gov.in', role: 'officer', full_name: 'Dr. Rajesh Kumar', organization_name: 'Ministry of Defense', is_active: true, created_at: '2024-01-01T10:00:00Z' },
  { id: 3, email: 'eval1@iitd.ac.in', role: 'evaluator', full_name: 'Prof. Ananya Roy', organization_name: 'IIT Delhi', is_active: true, created_at: '2024-01-05T10:00:00Z' },
  { id: 4, email: 'eval2@drdo.gov.in', role: 'evaluator', full_name: 'Dr. S. N. Varma', organization_name: 'DRDO', is_active: true, created_at: '2024-01-06T10:00:00Z' },
  { id: 5, email: 'ie@cert-in.org.in', role: 'independent-evaluator', full_name: 'Vikram Seth', organization_name: 'CERT-In Independent Bench', is_active: true, created_at: '2024-01-12T10:00:00Z' },
  { id: 6, email: 'admin@procurenext.gov.in', role: 'admin', full_name: 'System Admin', organization_name: 'ProcureNext Authority', is_active: true, created_at: '2024-01-01T08:00:00Z' },
];

export const mockStartups: StartupProfileMergedRead[] = [
  {
    user_id: 1,
    level1: {
      company_name: 'PromTech Pvt Ltd',
      dpiit_number: 'DPIIT98472',
      incorporation_date: '2021-04-15',
      website_url: 'https://promtech.io',
      primary_contact_name: 'Vikramaditya Sharma',
      primary_contact_email: 'tech@promtech.io',
      primary_contact_phone: '+91 98765 43210',
    },
    level2: {
      founding_team_summary: 'Ex-ISRO researchers and IIT Bombay alumni with 10+ yrs aerospace engineering experience.',
      technical_capabilities: 'High-precision chassis component optimization, generative AI CAD design, structural thermal analysis.',
      past_deployments_summary: 'Deployed pilot component testing with HAL and BEL with zero structural failure over 5,000 flight hours.',
      funding_band: 'Series A ($2.5M raised)',
      compliance_declarations: { dpiit_active: true, no_debarment: true, tax_cleared: true },
    },
    compliance_status: 'verified',
    verified_at: '2024-02-01T14:30:00Z',
    verified_by: 6,
    merged_at: '2024-02-01T14:30:00Z',
  }
];

export const mockProblemStatements: ProblemStatementRead[] = [
  {
    id: 1,
    title: 'Evaluation Submitted for Chassis and Component Optimization',
    domain: 'Aerospace & Defense Ops',
    description: 'High-stress lightweight alloy component design for military payload vehicle chassis requiring high structural yield.',
    target_outcomes: '30% weight reduction without compromising 500kN yield strength tolerance.',
    budget_allocated: 7500000,
    submission_deadline: '2024-10-15',
    created_by: 2,
    status: 'published',
    published_at: '2024-03-01T09:00:00Z',
    is_locked_field_editable: false,
    created_at: '2024-02-28T11:00:00Z',
    kpis: [
      { id: 101, problem_statement_id: 1, metric_name: 'Weight Reduction %', target_value: 30, unit: '%', verification_method: 'FEA Stress Strain & Physical Scale Test', created_at: '2024-03-01' },
      { id: 102, problem_statement_id: 1, metric_name: 'Yield Strength Tolerance', target_value: 500, unit: 'kN', verification_method: 'Hydraulic Press Loading', created_at: '2024-03-01' }
    ]
  },
  {
    id: 2,
    title: 'Bold-Innerntraeneoulr esstestors and Financial Ideation',
    domain: 'FinTech & AI Analytics',
    description: 'Autonomous financial risk ideation engine for real-time audit ledger anomaly detection.',
    target_outcomes: '99.4% detection rate for non-compliant procurement ledger entries.',
    budget_allocated: 4500000,
    submission_deadline: '2024-11-01',
    created_by: 2,
    status: 'published',
    published_at: '2024-03-10T10:00:00Z',
    is_locked_field_editable: false,
    created_at: '2024-03-05T12:00:00Z',
    kpis: [
      { id: 103, problem_statement_id: 2, metric_name: 'Anomaly Detection Rate', target_value: 99, unit: '%', verification_method: 'Synthetic Audit Benchmark', created_at: '2024-03-10' }
    ]
  }
];

export const mockApplications: ApplicationRead[] = [
  {
    id: 1,
    problem_statement_id: 1,
    startup_user_id: 1,
    proposal_title: 'PromTech Alloy Optimization Suite v2',
    technical_proposal_summary: 'Generative topological lattice optimization utilizing Ti-6Al-4V titanium alloy with 3D additive manufacturing support.',
    commercial_bid_amount: 6800000,
    implementation_timeline_weeks: 16,
    status: 'selected',
    commercial_unlocked_at: '2024-04-01T10:00:00Z',
    applied_at: '2024-03-15T16:20:00Z',
  }
];

export const mockEligibility: EligibilityCheckRead = {
  application_id: 1,
  dpiit_verified: true,
  entity_valid: true,
  pan_gst_present: true,
  overall_result: 'pass',
  reviewed_by: 2,
  reviewed_at: '2024-03-18T11:00:00Z',
  notes: 'All Level 1 & 2 certificates verified against Govt databases.',
};

export const mockChecklistItems: ChecklistItemRead[] = [
  { id: 1, application_id: 1, title: 'DPIIT Recognition Certificate', category: 'Compliance', status: 'approved', file_url: '/docs/dpiit.pdf' },
  { id: 2, application_id: 1, title: 'ISO 9001 Structural Safety Cert', category: 'Technical', status: 'approved', file_url: '/docs/iso.pdf' },
  { id: 3, application_id: 1, title: 'Audited Financial Balance Sheet (FY23)', category: 'Financial', status: 'approved', file_url: '/docs/financials.pdf' },
];

export const mockEvaluatorAssignments: PSEvaluatorAssignmentRead[] = [
  { id: 1, problem_statement_id: 1, evaluator_user_id: 3, evaluator_name: 'Prof. Ananya Roy', assigned_at: '2024-03-20T09:00:00Z' },
  { id: 2, problem_statement_id: 1, evaluator_user_id: 4, evaluator_name: 'Dr. S. N. Varma', assigned_at: '2024-03-20T09:00:00Z' },
];

export const mockCOIDeclarations: COIDeclarationRead[] = [
  { id: 1, application_id: 1, evaluator_id: 3, declared_at: '2024-03-21T10:00:00Z', has_conflict: false, status: 'cleared' },
  { id: 2, application_id: 1, evaluator_id: 4, declared_at: '2024-03-21T11:30:00Z', has_conflict: false, status: 'cleared' },
];

export const mockScores: EvaluationScoreRead[] = [
  {
    id: 1,
    application_id: 1,
    evaluator_id: 3,
    evaluator_name: 'Prof. Ananya Roy',
    scores: [
      { criterion_id: 1, score: 92, comments: 'Extremely thorough topological lattice FEA.' },
      { criterion_id: 2, score: 88, comments: 'Clear timeline and milestone deliverables.' }
    ],
    total_score: 90,
    submitted_at: '2024-03-25T14:00:00Z',
  },
  {
    id: 2,
    application_id: 1,
    evaluator_id: 4,
    evaluator_name: 'Dr. S. N. Varma',
    scores: [
      { criterion_id: 1, score: 85, comments: 'Solid metallurgy choices.' },
      { criterion_id: 2, score: 91, comments: 'High technical feasibility rating.' }
    ],
    total_score: 88,
    submitted_at: '2024-03-26T16:30:00Z',
  }
];

export const mockQCBSScore: QCBSScoreRead = {
  application_id: 1,
  technical_score: 89, // 70% weight -> 62.3
  commercial_score: 95, // 30% weight -> 28.5
  final_score: 90.8,
  rank: 1,
};

export const mockQCBSRankings: QCBSRankingRead = {
  problem_statement_id: 1,
  rankings: [
    { application_id: 1, proposal_title: 'PromTech Alloy Optimization Suite v2', startup_name: 'PromTech Pvt Ltd', technical_score: 89, commercial_score: 95, final_score: 90.8, rank: 1 }
  ]
};

export const mockRiskProfile: RiskProfileRead = {
  application_id: 1,
  financial_risk_score: 'low',
  technical_feasibility_risk: 'low',
  regulatory_risk: 'low',
  overall_risk_rating: 'low',
  summary_notes: 'Strong financial backing (Series A) with experienced aerospace engineering team.',
};

export const mockContainmentPlan: ContainmentPlanRead = {
  id: 1,
  application_id: 1,
  milestone_conditions: [
    'Milestone 1: Prototype FEA simulation signoff by Independent Evaluator',
    'Milestone 2: Physical load testing up to 500kN at NABL lab'
  ],
  penalty_clauses: 'Liquidated damages of 0.5% per week of delay up to a max 5% contract value.',
  special_terms: 'Independent Evaluator verification mandatory prior to tranche disbursement.',
  created_at: '2024-03-28T10:00:00Z',
};

export const mockDecisionReadiness: DecisionReadinessRead = {
  application_id: 1,
  eligibility_passed: true,
  checklist_complete: true,
  coi_resolved: true,
  scores_complete: true,
  risk_profile_assessed: true,
  containment_plan_attached: true,
  overall_ready: true,
  blocking_reasons: [],
};

export const mockContract: ContractRead = {
  id: 1,
  application_id: 1,
  startup_name: 'PromTech Pvt Ltd',
  problem_statement_title: 'Evaluation Submitted for Chassis and Component Optimization',
  contract_value: 6800000,
  signed_at: '2024-04-05T10:00:00Z',
  status: 'active',
};

export const mockMilestones: MilestoneRead[] = [
  { id: 1, contract_id: 1, title: 'Lattice FEA Computer Simulation Report', due_date: '2024-05-15', status: 'approved', evidence_url: '/evidence/fea_report.pdf', review_notes: 'Verified by IE Vikram Seth.' },
  { id: 2, contract_id: 1, title: '500kN Physical Hydraulic Stress Test', due_date: '2024-07-30', status: 'submitted', evidence_url: '/evidence/hydraulic_lab.pdf' }
];

export const mockKPIVerdicts: KPIVerdictRead[] = [
  { id: 1, contract_id: 1, kpi_id: 101, metric_name: 'Weight Reduction %', target_value: 30, submitted_value: 34.5, unit: '%', verdict: 'exceeded', remarks: 'Achieved 34.5% weight savings in prototype.' },
  { id: 2, contract_id: 1, kpi_id: 102, metric_name: 'Yield Strength Tolerance', target_value: 500, submitted_value: 520, unit: 'kN', verdict: 'promising', remarks: 'Tested up to 520kN before deformation.' }
];

export const mockPilotOutcome: PilotOutcomeRead = {
  id: 1,
  contract_id: 1,
  decision: 'scale',
  recommendation_notes: 'Exceeded weight optimization target while maintaining structural yield. Recommended for full defense procurement scale.',
  verdict_summary: 'KPI 101: Exceeded (+4.5%), KPI 102: Promising (+20kN).',
  recorded_at: '2024-08-15T11:00:00Z',
};

export const mockAuditLogs: AuditLogRead[] = [
  { id: 1, timestamp: '2024-08-15T11:00:00Z', actor_id: 2, actor_name: 'Dr. Rajesh Kumar', actor_role: 'officer', action: 'RECORD_PILOT_OUTCOME', entity_type: 'Contract', entity_id: 1, details: 'Recorded scale decision for PromTech pilot.' },
  { id: 2, timestamp: '2024-04-05T10:00:00Z', actor_id: 2, actor_name: 'Dr. Rajesh Kumar', actor_role: 'officer', action: 'SIGN_CONTRACT', entity_type: 'Application', entity_id: 1, details: 'Executed pilot contract valued at ₹6,800,000.' },
  { id: 3, timestamp: '2024-04-01T10:00:00Z', actor_id: 2, actor_name: 'Dr. Rajesh Kumar', actor_role: 'officer', action: 'SELECT_STARTUP', entity_type: 'Application', entity_id: 1, details: 'Selected PromTech Pvt Ltd after QCBS rank 1 confirmation.' },
  { id: 4, timestamp: '2024-03-28T10:00:00Z', actor_id: 2, actor_name: 'Dr. Rajesh Kumar', actor_role: 'officer', action: 'ATTACH_CONTAINMENT_PLAN', entity_type: 'Application', entity_id: 1, details: 'Attached milestone conditions & penalty clauses.' },
  { id: 5, timestamp: '2024-03-21T10:00:00Z', actor_id: 3, actor_name: 'Prof. Ananya Roy', actor_role: 'evaluator', action: 'DECLARE_COI', entity_type: 'Application', entity_id: 1, details: 'COI cleared: No conflict declared.' },
];
