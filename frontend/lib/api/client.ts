/**
 * Typed client for the FastAPI backend.
 *
 * Every method maps 1:1 onto a route registered in backend/app/routers/*.
 * Paths, HTTP verbs and body shapes are copied from the routers — nothing is
 * guessed. All routers are mounted in backend/app/main.py.
 *
 * Transport notes:
 * - Requests go to `/api/*` (same origin) and are proxied to FastAPI by the
 *   rewrite in next.config.ts. The backend registers no CORSMiddleware, so a
 *   direct cross-origin call from the browser would fail.
 * - Failures throw ApiError. Callers get a real status code and the FastAPI
 *   `detail` string, so the UI can distinguish 403 (wrong role) from 404
 *   (nothing recorded yet) from a genuine outage.
 */

import {
  ApplicationCreate,
  ApplicationRead,
  AuditLogRead,
  COIDeclarationCreate,
  COIDeclarationRead,
  ChecklistItemRead,
  ChecklistItemReviewUpdate,
  ChecklistItemUploadUpdate,
  ComplianceRecordRead,
  ComplianceVerificationRequest,
  ContainmentPlanAiAssistResponse,
  ContainmentPlanCreate,
  ContainmentPlanRead,
  ContractRead,
  DecisionReadinessRead,
  EligibilityCheckRead,
  EligibilityCheckReviewUpdate,
  EvaluationScoreCreate,
  EvaluationScoreRead,
  EvidenceCreate,
  EvidenceRead,
  InviteCreate,
  InviteRead,
  InviteWithConversionRead,
  KPICreate,
  KPIRead,
  KPIVerdictCreate,
  KPIVerdictRead,
  LoginRequest,
  MilestoneReviewUpdate,
  PSEvaluatorAssignmentCreate,
  PSEvaluatorAssignmentRead,
  PSEvaluatorAssignmentReplaceRequest,
  PSMatchRankingRead,
  PilotMilestoneRead,
  PilotMilestoneUpdate,
  PilotOutcomeCreate,
  PilotOutcomeRead,
  ProblemStatementAiAssistRequest,
  ProblemStatementAiAssistResponse,
  ProblemStatementCreate,
  ProblemStatementMatchRead,
  ProblemStatementRead,
  ProblemStatementUpdate,
  QCBSRankingRead,
  QCBSScoreRead,
  RiskProfileRead,
  RubricCriterionRead,
  SandboxTrialCreate,
  SandboxTrialRead,
  SandboxTrialUpdate,
  ScoreCompletenessRead,
  SelectionDecisionRead,
  StartupProfileLevel1Update,
  StartupProfileLevel2Update,
  StartupProfileMergedRead,
  StartupProfileRead,
  TokenResponse,
  UserCreate,
  UserRead,
} from '@/lib/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

const TOKEN_KEY = 'procurenext.token';

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly endpoint: string;

  constructor(status: number, detail: string, endpoint: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.endpoint = endpoint;
  }

  /** 404 usually means "this row has not been created yet", not a bug. */
  get isNotFound() {
    return this.status === 404;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  /** 0 is our sentinel for "the fetch never reached the server". */
  get isNetworkFailure() {
    return this.status === 0;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  invalidateApiCache();
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  invalidateApiCache();
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Pulls the FastAPI error message out of a response body of any shape. */
function extractDetail(body: string, status: number): string {
  if (!body) return `Request failed with status ${status}`;
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      // 422 validation errors: [{loc, msg, type}, ...]
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : '';
          return field ? `${field}: ${d.msg}` : d.msg;
        })
        .filter(Boolean)
        .join('; ');
    }
    if (detail) return JSON.stringify(detail);
  } catch {
    /* body was not JSON — fall through */
  }
  return body.slice(0, 300);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the Authorization header (login/register). */
  anonymous?: boolean;
}

// ── Client-side GET cache ─────────────────────────────────────
//
// Pages used to refetch everything on every mount: the problem-statement list
// alone was requested from 13 places, the nav bell refetched on every route,
// and list pages fan out one request per row. The backend is fixed, so the
// saving has to come from not asking twice:
//   - identical GETs in flight at the same time share one network request;
//   - a successful GET is reused for CACHE_TTL_MS;
//   - any write (POST/PATCH/PUT/DELETE) drops the whole cache, so a page never
//     shows data older than the user's own last change.
// Errors are never cached, so Retry always goes back to the server.

const CACHE_TTL_MS = 30_000;
const responseCache = new Map<string, { at: number; data: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();
// Bumped on every invalidation, so a GET that started before a write cannot
// land its now-stale response in the cache after the write cleared it.
let cacheGeneration = 0;

/** Forget every cached response — on writes, sign-in and sign-out. */
export function invalidateApiCache() {
  cacheGeneration += 1;
  responseCache.clear();
  inFlight.clear();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';

  if (method !== 'GET') {
    try {
      return await send<T>(path, options);
    } finally {
      invalidateApiCache();
    }
  }

  // Keyed on the token too, so two accounts in one tab never share rows.
  const key = `${getToken() ?? ''}|${path}|${JSON.stringify(options.query ?? {})}`;

  const hit = responseCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const generation = cacheGeneration;
  const promise = send<T>(path, options)
    .then((data) => {
      if (generation === cacheGeneration) {
        responseCache.set(key, { at: Date.now(), data });
      }
      return data;
    })
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, anonymous } = options;

  let url = `${API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!anonymous) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach the API. Start the FastAPI server (uvicorn app.main:app --reload) and reload this page.',
      path,
    );
  }

  if (res.status === 401 && !anonymous) {
    // Token missing, expired or invalid — drop it so the app stops pretending
    // to be signed in, and let the route guard bounce the user to /login.
    clearToken();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, extractDetail(text, res.status), path);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Wraps a GET whose 404 legitimately means "not created yet" (e.g. a
 * containment plan before the officer files one), returning null instead.
 */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

export const api = {
  // ── Health ────────────────────────────────────────────────
  /** GET /health */
  health: () => request<{ status: string }>('/health', { anonymous: true }),

  // ── Auth & Users ──────────────────────────────────────────
  /** POST /auth/register — startup accounts only; role is forced server-side. */
  register: (payload: Omit<UserCreate, 'role'>) =>
    request<UserRead>('/auth/register', {
      method: 'POST',
      body: payload,
      anonymous: true,
    }),

  /** POST /auth/login */
  login: (payload: LoginRequest) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      anonymous: true,
    }),

  /** POST /admin/users — admin provisions non-startup accounts. */
  provisionUser: (payload: UserCreate) =>
    request<UserRead>('/admin/users', { method: 'POST', body: payload }),

  /** GET /admin/users */
  getUsers: () => request<UserRead[]>('/admin/users'),

  // ── Startup profile ───────────────────────────────────────
  /** GET /startup/profile — the signed-in startup's own profile. */
  getMyProfile: () => request<StartupProfileRead>('/startup/profile'),

  /** PATCH /startup/profile/level1 */
  updateProfileLevel1: (payload: StartupProfileLevel1Update) =>
    request<StartupProfileRead>('/startup/profile/level1', {
      method: 'PATCH',
      body: payload,
    }),

  /** PATCH /startup/profile/level2 */
  updateProfileLevel2: (payload: StartupProfileLevel2Update) =>
    request<StartupProfileRead>('/startup/profile/level2', {
      method: 'PATCH',
      body: payload,
    }),

  /** GET /startup/profile/{user_id} — merged User+profile, for reviewers. */
  getStartupProfile: (userId: number) =>
    request<StartupProfileMergedRead>(`/startup/profile/${userId}`),

  /** POST /admin/startups/{user_id}/verify-compliance */
  verifyStartupCompliance: (userId: number, payload: ComplianceVerificationRequest) =>
    request<StartupProfileRead>(`/admin/startups/${userId}/verify-compliance`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /admin/startups?compliance_status=unverified */
  getUnverifiedStartups: () =>
    request<StartupProfileRead[]>('/admin/startups', {
      query: { compliance_status: 'unverified' },
    }),

  // ── Problem statements ────────────────────────────────────
  /** POST /problem-statements */
  createProblemStatement: (payload: ProblemStatementCreate) =>
    request<ProblemStatementRead>('/problem-statements', {
      method: 'POST',
      body: payload,
    }),

  /** GET /problem-statements */
  getProblemStatements: () => request<ProblemStatementRead[]>('/problem-statements'),

  /** GET /problem-statements/{id} */
  getProblemStatement: (psId: number) =>
    request<ProblemStatementRead>(`/problem-statements/${psId}`),

  /** PATCH /problem-statements/{id} */
  updateProblemStatement: (psId: number, payload: ProblemStatementUpdate) =>
    request<ProblemStatementRead>(`/problem-statements/${psId}`, {
      method: 'PATCH',
      body: payload,
    }),

  /** POST /problem-statements/{id}/publish */
  publishProblemStatement: (psId: number) =>
    request<ProblemStatementRead>(`/problem-statements/${psId}/publish`, {
      method: 'POST',
    }),

  /** POST /problem-statements/{id}/close */
  closeProblemStatement: (psId: number) =>
    request<ProblemStatementRead>(`/problem-statements/${psId}/close`, {
      method: 'POST',
    }),

  /** POST /problem-statements/{id}/ai-assist — advisory only, never writes. */
  problemStatementAiAssist: (psId: number, payload: ProblemStatementAiAssistRequest) =>
    request<ProblemStatementAiAssistResponse>(`/problem-statements/${psId}/ai-assist`, {
      method: 'POST',
      body: payload,
    }),

  // ── KPIs ──────────────────────────────────────────────────
  /** POST /problem-statements/{id}/kpis */
  createKPI: (psId: number, payload: KPICreate) =>
    request<KPIRead>(`/problem-statements/${psId}/kpis`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /problem-statements/{id}/kpis */
  getKPIs: (psId: number) => request<KPIRead[]>(`/problem-statements/${psId}/kpis`),

  // ── Semantic matching ─────────────────────────────────────
  /** GET /startup/problem-statements — published PSs with a `recommended` flag. */
  getMatchedProblemStatements: () =>
    request<ProblemStatementMatchRead[]>('/startup/problem-statements'),

  /** GET /problem-statements/{id}/matches — ranked startups for this PS. */
  getPSMatches: (psId: number) =>
    request<PSMatchRankingRead>(`/problem-statements/${psId}/matches`),

  // ── Applications ──────────────────────────────────────────
  /** POST /applications */
  createApplication: (payload: ApplicationCreate) =>
    request<ApplicationRead>('/applications', { method: 'POST', body: payload }),

  /**
   * GET /applications?problem_statement_id=... — officer-owner or admin.
   *
   * The route requires exactly one filter and rejects a bare /applications with
   * 400, so the two branches are separate methods here.
   */
  getApplicationsForPS: (problemStatementId: number) =>
    request<ApplicationRead[]>('/applications', {
      query: { problem_statement_id: problemStatementId },
    }),

  /** GET /applications?startup_id=... — the startup's own list, or admin. */
  getApplicationsForStartup: (startupId: number) =>
    request<ApplicationRead[]>('/applications', { query: { startup_id: startupId } }),

  /** GET /applications/{id} */
  getApplication: (appId: number) => request<ApplicationRead>(`/applications/${appId}`),

  // ── Eligibility ───────────────────────────────────────────
  /** GET /applications/{id}/eligibility-check */
  getEligibilityCheck: (appId: number) =>
    request<EligibilityCheckRead>(`/applications/${appId}/eligibility-check`),

  /** PATCH /applications/{id}/eligibility-check */
  updateEligibilityCheck: (appId: number, payload: EligibilityCheckReviewUpdate) =>
    request<EligibilityCheckRead>(`/applications/${appId}/eligibility-check`, {
      method: 'PATCH',
      body: payload,
    }),

  // ── Selection ─────────────────────────────────────────────
  /** POST /applications/{id}/select — empty body; the server gates on readiness. */
  selectApplication: (appId: number) =>
    request<SelectionDecisionRead>(`/applications/${appId}/select`, {
      method: 'POST',
      body: {},
    }),

  // ── Checklist ─────────────────────────────────────────────
  /** GET /applications/{id}/checklist */
  getChecklist: (appId: number) =>
    request<ChecklistItemRead[]>(`/applications/${appId}/checklist`),

  /** PATCH /applications/{id}/checklist/{item_id} — startup attaches a file ref. */
  uploadChecklistItem: (
    appId: number,
    itemId: number,
    payload: ChecklistItemUploadUpdate,
  ) =>
    request<ChecklistItemRead>(`/applications/${appId}/checklist/${itemId}`, {
      method: 'PATCH',
      body: payload,
    }),

  /** PATCH /applications/{id}/checklist/{item_id}/review — officer verifies. */
  reviewChecklistItem: (
    appId: number,
    itemId: number,
    payload: ChecklistItemReviewUpdate,
  ) =>
    request<ChecklistItemRead>(`/applications/${appId}/checklist/${itemId}/review`, {
      method: 'PATCH',
      body: payload,
    }),

  // ── Evaluators & COI ──────────────────────────────────────
  /** GET /problem-statements/{id}/evaluators */
  getEvaluatorAssignments: (psId: number) =>
    request<PSEvaluatorAssignmentRead[]>(`/problem-statements/${psId}/evaluators`),

  /** POST /problem-statements/{id}/evaluators */
  assignEvaluator: (psId: number, payload: PSEvaluatorAssignmentCreate) =>
    request<PSEvaluatorAssignmentRead>(`/problem-statements/${psId}/evaluators`, {
      method: 'POST',
      body: payload,
    }),

  /** POST /problem-statements/{id}/evaluators/replace */
  replaceEvaluator: (psId: number, payload: PSEvaluatorAssignmentReplaceRequest) =>
    request<PSEvaluatorAssignmentRead>(
      `/problem-statements/${psId}/evaluators/replace`,
      { method: 'POST', body: payload },
    ),

  /** POST /applications/{id}/coi-declaration */
  declareCOI: (appId: number, payload: COIDeclarationCreate) =>
    request<COIDeclarationRead>(`/applications/${appId}/coi-declaration`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /applications/{id}/coi-declaration — the caller's own declaration. */
  getCOIDeclaration: (appId: number) =>
    request<COIDeclarationRead>(`/applications/${appId}/coi-declaration`),


  // ── Technical scoring ─────────────────────────────────────
  /** GET /rubric-criteria — the seeded platform-wide criteria. */
  getRubricCriteria: () => request<RubricCriterionRead[]>('/rubric-criteria'),

  /** POST /applications/{id}/scores — all criteria submitted in one call. */
  submitScores: (appId: number, payload: EvaluationScoreCreate) =>
    request<EvaluationScoreRead[]>(`/applications/${appId}/scores`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /applications/{id}/scores */
  getScores: (appId: number) =>
    request<EvaluationScoreRead[]>(`/applications/${appId}/scores`),

  /** GET /applications/{id}/scores/completeness */
  getScoreCompleteness: (appId: number) =>
    request<ScoreCompletenessRead>(`/applications/${appId}/scores/completeness`),

  // ── QCBS ──────────────────────────────────────────────────
  /** GET /applications/{id}/qcbs-score */
  getQCBSScore: (appId: number) =>
    request<QCBSScoreRead>(`/applications/${appId}/qcbs-score`),

  /** GET /problem-statements/{id}/qcbs-ranking */
  getQCBSRanking: (psId: number) =>
    request<QCBSRankingRead>(`/problem-statements/${psId}/qcbs-ranking`),

  // ── Risk & containment ────────────────────────────────────
  /** GET /applications/{id}/risk-profile — preliminary and/or final rows. */
  getRiskProfiles: (appId: number) =>
    request<RiskProfileRead[]>(`/applications/${appId}/risk-profile`),

  /** POST /applications/{id}/containment-plan/ai-assist — advisory, no write. */
  containmentAiAssist: (appId: number) =>
    request<ContainmentPlanAiAssistResponse>(
      `/applications/${appId}/containment-plan/ai-assist`,
      { method: 'POST', body: {} },
    ),

  /** POST /applications/{id}/containment-plan — upsert. */
  submitContainmentPlan: (appId: number, payload: ContainmentPlanCreate) =>
    request<ContainmentPlanRead>(`/applications/${appId}/containment-plan`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /applications/{id}/containment-plan */
  getContainmentPlan: (appId: number) =>
    request<ContainmentPlanRead>(`/applications/${appId}/containment-plan`),

  // ── Decision readiness ────────────────────────────────────
  /** GET /applications/{id}/decision-readiness */
  getDecisionReadiness: (appId: number) =>
    request<DecisionReadinessRead>(`/applications/${appId}/decision-readiness`),

  // ── Layer 5 — Sandbox trial ─
  /** POST /applications/{id}/sandbox-trial */
  createSandboxTrial: (appId: number, payload: SandboxTrialCreate) =>
    request<SandboxTrialRead>(`/applications/${appId}/sandbox-trial`, {
      method: 'POST',
      body: payload,
    }),

  /** PATCH /applications/{id}/sandbox-trial/{trial_id} */
  updateSandboxTrial: (appId: number, trialId: number, payload: SandboxTrialUpdate) =>
    request<SandboxTrialRead>(`/applications/${appId}/sandbox-trial/${trialId}`, {
      method: 'PATCH',
      body: payload,
    }),

  /** GET /applications/{id}/sandbox-trial */
  getSandboxTrial: (appId: number) =>
    request<SandboxTrialRead>(`/applications/${appId}/sandbox-trial`),

  // ── Layer 5 — Contract ─────
  /** POST /applications/{id}/contract — empty body, clauses derived server-side. */
  createContract: (appId: number) =>
    request<ContractRead>(`/applications/${appId}/contract`, {
      method: 'POST',
      body: {},
    }),

  /** GET /applications/{id}/contract */
  getContract: (appId: number) =>
    request<ContractRead>(`/applications/${appId}/contract`),

  // ── Layer 5 — Milestones ───
  /** GET /contracts/{id}/milestones */
  getMilestones: (contractId: number) =>
    request<PilotMilestoneRead[]>(`/contracts/${contractId}/milestones`),

  /** PATCH /contracts/{id}/milestones/{milestone_id} — officer sets targets. */
  updateMilestone: (
    contractId: number,
    milestoneId: number,
    payload: PilotMilestoneUpdate,
  ) =>
    request<PilotMilestoneRead>(`/contracts/${contractId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: payload,
    }),

  /** POST /contracts/{id}/milestones/{milestone_id}/evidence — startup submits. */
  submitEvidence: (contractId: number, milestoneId: number, payload: EvidenceCreate) =>
    request<EvidenceRead>(
      `/contracts/${contractId}/milestones/${milestoneId}/evidence`,
      { method: 'POST', body: payload },
    ),

  /** PATCH /contracts/{id}/milestones/{milestone_id}/review */
  reviewMilestone: (
    contractId: number,
    milestoneId: number,
    payload: MilestoneReviewUpdate,
  ) =>
    request<PilotMilestoneRead>(
      `/contracts/${contractId}/milestones/${milestoneId}/review`,
      { method: 'PATCH', body: payload },
    ),

  // ── Layer 5 — KPI verdicts ─
  /** POST /contracts/{id}/kpi-verdicts */
  submitKPIVerdict: (contractId: number, payload: KPIVerdictCreate) =>
    request<KPIVerdictRead>(`/contracts/${contractId}/kpi-verdicts`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /contracts/{id}/kpi-verdicts */
  getKPIVerdicts: (contractId: number) =>
    request<KPIVerdictRead[]>(`/contracts/${contractId}/kpi-verdicts`),

  // ── Layer 5 — Pilot outcome ─
  /** POST /contracts/{id}/pilot-outcome */
  createPilotOutcome: (contractId: number, payload: PilotOutcomeCreate) =>
    request<PilotOutcomeRead>(`/contracts/${contractId}/pilot-outcome`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /contracts/{id}/pilot-outcome */
  getPilotOutcome: (contractId: number) =>
    request<PilotOutcomeRead>(`/contracts/${contractId}/pilot-outcome`),

  // ── Invites ────────────────
  /** POST /problem-statements/{id}/invite */
  sendInvite: (psId: number, payload: InviteCreate) =>
    request<InviteRead>(`/problem-statements/${psId}/invite`, {
      method: 'POST',
      body: payload,
    }),

  /** GET /problem-statements/{id}/invites — with live conversion flags. */
  getPSInvites: (psId: number) =>
    request<InviteWithConversionRead[]>(`/problem-statements/${psId}/invites`),

  /** GET /startup/invites */
  getMyInvites: () => request<InviteRead[]>('/startup/invites'),

  // ── Compliance records ─────
  /** POST /admin/applications/{id}/compliance-record */
  generateComplianceRecord: (appId: number) =>
    request<ComplianceRecordRead>(`/admin/applications/${appId}/compliance-record`, {
      method: 'POST',
    }),

  /** GET /admin/applications/{id}/compliance-records */
  getComplianceRecords: (appId: number) =>
    request<ComplianceRecordRead[]>(`/admin/applications/${appId}/compliance-records`),

  /** GET /admin/compliance-records/{record_id} */
  getComplianceRecord: (recordId: number) =>
    request<ComplianceRecordRead>(`/admin/compliance-records/${recordId}`),
};

export type { AuditLogRead };
