'use client';

/**
 * Self-fetching panels, one per backend resource hanging off an application or
 * a contract. Each owns its own request, loading state and error state, so the
 * pages that compose them stay thin and no screen silently omits a resource.
 *
 * Panels take a `canAct` flag rather than a role: the caller already knows
 * whether this viewer is the owning officer / the assigned evaluator / the
 * startup, so the panel just renders the write affordance or omits it. The
 * server re-checks permission regardless.
 */

import React, { useEffect, useState } from 'react';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocInput,
  DocSelect,
  DocTextarea,
  SectionDivider,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  fmtDate,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import { api, orNull } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import {
  COIDeclarationRead,
  CertificationCheckEnum,
  KPIVerdictResultEnum,
  MilestoneStatusEnum,
  PassFailNCEnum,
  PaymentStatusEnum,
  PilotOutcomeResultEnum,
  RiskLevelEnum,
  SandboxCheckEnum,
  SandboxVerdictEnum,
  VerificationModeEnum,
} from '@/lib/types/api';
import { CheckCircle2, CircleDashed, Save, Upload } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────

export const PanelHeading: React.FC<{
  title: string;
  endpoint: string;
  right?: React.ReactNode;
}> = ({ title, endpoint, right }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div>
      <h3 className="text-sm font-bold text-[#1A1A1A]">{title}</h3>
      <p className="font-mono text-[10px] text-[#A89F94] mt-0.5">{endpoint}</p>
    </div>
    {right}
  </div>
);

const KeyValue: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-3 py-1.5 border-b border-[#F1EDE4] last:border-b-0">
    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94] w-40 shrink-0 pt-0.5">
      {label}
    </span>
    <span className="text-xs text-[#1A1A1A] font-medium flex-1 break-words">
      {value === undefined || value === null || value === '' ? '—' : value}
    </span>
  </div>
);

const RISK_COLORS: Record<RiskLevelEnum, { bg: string; text: string; border: string }> = {
  low: { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
  medium: { bg: '#FDF3DC', text: '#B8860B', border: '#F7E1B5' },
  high: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

const MutationFeedback: React.FC<{ state: ReturnType<typeof useMutation> }> = ({ state }) => (
  <>
    {state.error && <AlertStrip type="error" title="Not saved" message={state.error.detail} />}
    {state.success && <AlertStrip type="success" message={state.success} />}
  </>
);

// ─────────────────────────────────────────────────────────────
// Eligibility — GET / PATCH /applications/{id}/eligibility-check
// ─────────────────────────────────────────────────────────────

export const EligibilityPanel: React.FC<{ appId: number; canReview?: boolean }> = ({
  appId,
  canReview = false,
}) => {
  const query = useQuery(() => api.getEligibilityCheck(appId), [appId]);
  const save = useMutation();

  const [sectorEligible, setSectorEligible] = useState<PassFailNCEnum | ''>('');
  const [certification, setCertification] = useState<CertificationCheckEnum | ''>('');

  useEffect(() => {
    if (!query.data) return;
    setSectorEligible(query.data.sector_eligible ?? '');
    setCertification(query.data.certification_check ?? '');
  }, [query.data]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.run(
      () =>
        api.updateEligibilityCheck(appId, {
          sector_eligible: sectorEligible || null,
          certification_check: certification || null,
        }),
      { successMessage: 'Eligibility review saved.', onSuccess: (row) => query.setData(row) },
    );
  };

  return (
    <DataCard>
      <PanelHeading
        title="Eligibility check"
        endpoint={`GET /applications/${appId}/eligibility-check`}
        right={
          query.data?.overall_result ? (
            <StatusBadge
              status={
                query.data.overall_result === 'eligible'
                  ? 'success'
                  : query.data.overall_result === 'not_eligible'
                    ? 'error'
                    : 'warning'
              }
              label={humanize(query.data.overall_result)}
            />
          ) : undefined
        }
      />

      {query.loading && <LoadingBlock label="Loading eligibility…" rows={2} />}
      {query.error && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="No eligibility check recorded yet"
        />
      )}

      {query.data && (
        <>
          <div className="space-y-0">
            <KeyValue label="DPIIT verified" value={humanize(query.data.dpiit_verified)} />
            <KeyValue label="Entity valid" value={humanize(query.data.entity_valid)} />
            <KeyValue label="PAN / GST present" value={humanize(query.data.pan_gst_present)} />
            <KeyValue label="Certification check" value={humanize(query.data.certification_check)} />
            <KeyValue label="Sector eligible" value={humanize(query.data.sector_eligible)} />
            <KeyValue label="Overall result" value={humanize(query.data.overall_result)} />
            <KeyValue
              label="Reviewed"
              value={
                query.data.reviewed_at
                  ? `${fmtDateTime(query.data.reviewed_at)} by user #${query.data.reviewed_by}`
                  : 'Not reviewed yet'
              }
            />
            <KeyValue label="Snapshot taken" value={fmtDateTime(query.data.created_at)} />
          </div>

          {canReview && (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <SectionDivider label="Officer review" />
              <p className="text-[11px] text-[#6B6560]">
                Only these two fields are officer-set. The DPIIT, entity and PAN/GST
                values are a snapshot of verified compliance data and cannot be
                edited here.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1 block">
                  <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
                    Sector eligible
                  </span>
                  <DocSelect
                    value={sectorEligible}
                    onChange={(e) => setSectorEligible(e.target.value as PassFailNCEnum | '')}
                  >
                    <option value="">Not set</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="needs_clarification">Needs clarification</option>
                  </DocSelect>
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
                    Certification check
                  </span>
                  <DocSelect
                    value={certification}
                    onChange={(e) =>
                      setCertification(e.target.value as CertificationCheckEnum | '')
                    }
                  >
                    <option value="">Not set</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="needs_clarification">Needs clarification</option>
                    <option value="not_applicable">Not applicable</option>
                  </DocSelect>
                </label>
              </div>

              <MutationFeedback state={save} />

              <DocButton
                type="submit"
                variant="primary"
                role="officer"
                size="sm"
                loading={save.pending}
                icon={<Save className="w-3 h-3" />}
              >
                Save review
              </DocButton>
            </form>
          )}
        </>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Checklist — GET + PATCH upload + PATCH review
// ─────────────────────────────────────────────────────────────

export const ChecklistPanel: React.FC<{
  appId: number;
  /** Startup: attach a file reference to a pending item. */
  canUpload?: boolean;
  /** Officer: verify or reject an uploaded item. */
  canReview?: boolean;
}> = ({ appId, canUpload = false, canReview = false }) => {
  const query = useQuery(() => api.getChecklist(appId), [appId]);
  const action = useMutation();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const upload = (itemId: number) => {
    const reference = (drafts[itemId] ?? '').trim();
    if (!reference) return;
    action.run(
      () => api.uploadChecklistItem(appId, itemId, { file_reference: reference }),
      {
        successMessage: 'Document reference recorded.',
        onSuccess: () => {
          setDrafts((d) => ({ ...d, [itemId]: '' }));
          query.refetch();
        },
      },
    );
  };

  const review = (itemId: number, status: 'verified' | 'rejected') => {
    action.run(() => api.reviewChecklistItem(appId, itemId, { status }), {
      successMessage: `Item marked ${status}.`,
      onSuccess: () => query.refetch(),
    });
  };

  const items = query.data ?? [];
  const verified = items.filter((i) => i.status === 'verified').length;

  return (
    <DataCard>
      <PanelHeading
        title="Document checklist"
        endpoint={`GET /applications/${appId}/checklist`}
        right={
          items.length > 0 ? (
            <StatusBadge
              status={verified === items.length ? 'success' : 'pending'}
              label={`${verified}/${items.length} verified`}
            />
          ) : undefined
        }
      />

      {query.loading && <LoadingBlock label="Loading checklist…" />}
      {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && items.length === 0 && (
        <EmptyState
          title="No checklist items"
          hint="The checklist is generated from the problem statement's required documents when the application is created."
        />
      )}

      <MutationFeedback state={action} />

      <div className="divide-y divide-[#F1EDE4]">
        {items.map((item) => (
          <div key={item.id} className="py-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1A1A1A]">{item.document_name}</div>
                <div className="text-[11px] text-[#6B6560]">
                  {item.file_reference ? (
                    <span className="font-mono break-all">{item.file_reference}</span>
                  ) : (
                    'Nothing uploaded'
                  )}
                </div>
                {item.reviewed_at && (
                  <div className="text-[10px] text-[#A89F94]">
                    Reviewed {fmtDateTime(item.reviewed_at)} by user #{item.reviewed_by}
                  </div>
                )}
              </div>
              <StatusBadge
                status={
                  item.status === 'verified'
                    ? 'success'
                    : item.status === 'rejected'
                      ? 'error'
                      : item.status === 'uploaded'
                        ? 'info'
                        : 'pending'
                }
                label={humanize(item.status)}
              />
            </div>

            {canUpload && item.status !== 'verified' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <DocInput
                    lineStyle={false}
                    value={drafts[item.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    placeholder="Document URL or storage reference"
                    aria-label={`File reference for ${item.document_name}`}
                  />
                </div>
                <DocButton
                  size="sm"
                  variant="secondary"
                  role="startup"
                  onClick={() => upload(item.id)}
                  disabled={!(drafts[item.id] ?? '').trim() || action.pending}
                  icon={<Upload className="w-3 h-3" />}
                >
                  Attach
                </DocButton>
              </div>
            )}

            {canReview && item.status === 'uploaded' && (
              <div className="flex gap-2">
                <DocButton
                  size="sm"
                  variant="secondary"
                  role="officer"
                  onClick={() => review(item.id, 'verified')}
                  disabled={action.pending}
                >
                  Verify
                </DocButton>
                <DocButton
                  size="sm"
                  variant="danger"
                  onClick={() => review(item.id, 'rejected')}
                  disabled={action.pending}
                >
                  Reject
                </DocButton>
              </div>
            )}
          </div>
        ))}
      </div>

      {canUpload && (
        <p className="text-[10px] text-[#A89F94] italic mt-3">
          The backend stores a reference string, not the file itself — there is no
          upload endpoint. Paste the URL or storage key where the document lives.
        </p>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Scores — GET/POST /applications/{id}/scores, completeness
// ─────────────────────────────────────────────────────────────

export const ScoresPanel: React.FC<{ appId: number; showCompleteness?: boolean }> = ({
  appId,
  showCompleteness = false,
}) => {
  const scores = useQuery(() => api.getScores(appId), [appId]);
  const criteria = useQuery(() => api.getRubricCriteria(), []);
  const completeness = useQuery(() => api.getScoreCompleteness(appId), [appId], {
    enabled: showCompleteness,
  });

  const criterionById = new Map((criteria.data ?? []).map((c) => [c.id, c]));

  // One row per evaluator, so the officer sees each panellist's sheet.
  const byEvaluator = new Map<number, typeof scores.data>();
  for (const s of scores.data ?? []) {
    const list = byEvaluator.get(s.evaluator_id) ?? [];
    byEvaluator.set(s.evaluator_id, [...(list ?? []), s]);
  }

  return (
    <DataCard>
      <PanelHeading title="Technical scores" endpoint={`GET /applications/${appId}/scores`} />

      {showCompleteness && completeness.data && (
        <div className="mb-4">
          <AlertStrip
            type={completeness.data.complete ? 'success' : 'warning'}
            title={completeness.data.complete ? 'Scoring complete' : 'Scoring incomplete'}
            message={
              completeness.data.complete
                ? 'Every assigned, non-recused evaluator has submitted.'
                : `Still pending from evaluator ids: ${
                    completeness.data.pending_evaluator_ids.join(', ') || 'none listed'
                  }`
            }
          />
        </div>
      )}
      {showCompleteness && completeness.error && (
        <div className="mb-4">
          <ApiErrorState error={completeness.error} onRetry={completeness.refetch} />
        </div>
      )}

      {scores.loading && <LoadingBlock label="Loading scores…" />}
      {scores.error && <ApiErrorState error={scores.error} onRetry={scores.refetch} />}

      {scores.data && scores.data.length === 0 && (
        <EmptyState title="No scores submitted yet" hint="Assigned evaluators submit a full sheet in one go." />
      )}

      <div className="space-y-5">
        {[...byEvaluator.entries()].map(([evaluatorId, rows]) => {
          const list = rows ?? [];
          // Weighted total, using each criterion's weight from /rubric-criteria.
          const weighted = list.reduce((sum, r) => {
            const w = criterionById.get(r.criterion_id)?.weight ?? 0;
            return sum + (r.score * w) / 100;
          }, 0);

          return (
            <div key={evaluatorId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1A1A]">
                  Evaluator #{evaluatorId}
                </span>
                {criteria.data && (
                  <span className="text-[11px] font-bold text-[#6B6560]">
                    Weighted total {weighted.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="divide-y divide-[#F1EDE4]">
                {list.map((row) => {
                  const criterion = criterionById.get(row.criterion_id);
                  return (
                    <div key={row.id} className="py-2.5 flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#1A1A1A]">
                          {criterion?.name ?? `Criterion #${row.criterion_id}`}
                          {criterion && (
                            <span className="text-[10px] font-normal text-[#A89F94] ml-1.5">
                              weight {criterion.weight}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B6560] leading-relaxed mt-0.5">
                          {row.justification}
                        </p>
                      </div>
                      <div className="text-sm font-black text-[#1A1A1A] shrink-0 tabular-nums">
                        {row.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// QCBS — GET /applications/{id}/qcbs-score
// ─────────────────────────────────────────────────────────────

export const QCBSPanel: React.FC<{ appId: number }> = ({ appId }) => {
  const query = useQuery(() => api.getQCBSScore(appId), [appId]);

  return (
    <DataCard>
      <PanelHeading title="QCBS score" endpoint={`GET /applications/${appId}/qcbs-score`} />

      {query.loading && <LoadingBlock label="Computing…" rows={1} />}
      {query.error && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="QCBS score not available yet"
        />
      )}

      {query.data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Technical', value: query.data.technical_score },
            { label: 'Commercial', value: query.data.commercial_score },
            { label: 'Final', value: query.data.final_score, emphasis: true },
          ].map((cell) => (
            <div
              key={cell.label}
              className="p-4 rounded-lg text-center"
              style={{
                backgroundColor: cell.emphasis ? '#EAF7ED' : '#F8F6F1',
                border: `1px solid ${cell.emphasis ? '#B8E6C4' : '#E8E2D5'}`,
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94]">
                {cell.label}
              </div>
              <div
                className="text-2xl font-black mt-1 tabular-nums"
                style={{ color: cell.emphasis ? '#1E9E5A' : '#1A1A1A' }}
              >
                {cell.value.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Risk profile — GET /applications/{id}/risk-profile
// ─────────────────────────────────────────────────────────────

export const RiskProfilePanel: React.FC<{ appId: number }> = ({ appId }) => {
  const query = useQuery(() => api.getRiskProfiles(appId), [appId]);

  return (
    <DataCard>
      <PanelHeading title="Risk profile" endpoint={`GET /applications/${appId}/risk-profile`} />

      {query.loading && <LoadingBlock label="Loading risk profile…" />}
      {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && query.data.length === 0 && (
        <EmptyState
          title="No risk profile computed yet"
          hint="Risk is computed by the system from the problem statement and the startup's Level 2 profile — there is nothing to fill in by hand."
        />
      )}

      <div className="space-y-5">
        {(query.data ?? []).map((profile) => (
          <div key={profile.id} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1A1A]">
                {humanize(profile.stage)} profile
              </span>
              <span className="text-[10px] text-[#A89F94]">
                Computed {fmtDateTime(profile.computed_at)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  ['Technical', profile.technical_risk],
                  ['Financial', profile.financial_risk],
                  ['Implementation', profile.implementation_risk],
                  ['Cybersecurity', profile.cybersecurity_risk],
                  ['Data', profile.data_risk],
                  ['Scalability', profile.scalability_risk],
                  ['Overall', profile.overall_risk],
                ] as [string, RiskLevelEnum][]
              ).map(([label, level]) => {
                const colors = RISK_COLORS[level];
                const isOverall = label === 'Overall';
                return (
                  <div
                    key={label}
                    className="px-3 py-2 rounded-lg text-center"
                    style={{
                      backgroundColor: colors.bg,
                      border: `${isOverall ? 2 : 1}px solid ${colors.border}`,
                    }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#A89F94]">
                      {label}
                    </div>
                    <div
                      className="text-xs font-black uppercase mt-0.5"
                      style={{ color: colors.text }}
                    >
                      {level}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Containment plan — ai-assist + POST + GET
// ─────────────────────────────────────────────────────────────

const CONTAINMENT_FIELDS = [
  { key: 'max_scope', label: 'Maximum scope' },
  { key: 'max_financial_exposure', label: 'Maximum financial exposure' },
  { key: 'fallback_process', label: 'Fallback process' },
  { key: 'data_terms', label: 'Data terms' },
  { key: 'exit_conditions', label: 'Exit conditions' },
  { key: 'support_obligations', label: 'Support obligations' },
] as const;

type ContainmentField = (typeof CONTAINMENT_FIELDS)[number]['key'];

export const ContainmentPlanPanel: React.FC<{ appId: number; canEdit?: boolean }> = ({
  appId,
  canEdit = false,
}) => {
  const query = useQuery(() => api.getContainmentPlan(appId), [appId]);
  const save = useMutation();
  const assist = useMutation();

  const [values, setValues] = useState<Record<ContainmentField, string>>({
    max_scope: '',
    max_financial_exposure: '',
    fallback_process: '',
    data_terms: '',
    exit_conditions: '',
    support_obligations: '',
  });

  useEffect(() => {
    if (!query.data) return;
    setValues({
      max_scope: query.data.max_scope ?? '',
      max_financial_exposure: query.data.max_financial_exposure ?? '',
      fallback_process: query.data.fallback_process ?? '',
      data_terms: query.data.data_terms ?? '',
      exit_conditions: query.data.exit_conditions ?? '',
      support_obligations: query.data.support_obligations ?? '',
    });
  }, [query.data]);

  const runAssist = () => {
    assist.run(() => api.containmentAiAssist(appId), {
      successMessage: 'Draft filled in below — review and edit before submitting.',
      onSuccess: (draft) =>
        setValues((current) => ({
          // Advisory only: never clobber something the officer already wrote.
          ...current,
          max_scope: current.max_scope || draft.max_scope || '',
          fallback_process: current.fallback_process || draft.fallback_process || '',
          data_terms: current.data_terms || draft.data_terms || '',
          exit_conditions: current.exit_conditions || draft.exit_conditions || '',
        })),
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.run(
      () =>
        api.submitContainmentPlan(appId, {
          max_scope: values.max_scope || null,
          max_financial_exposure: values.max_financial_exposure || null,
          fallback_process: values.fallback_process || null,
          data_terms: values.data_terms || null,
          exit_conditions: values.exit_conditions || null,
          support_obligations: values.support_obligations || null,
        }),
      { successMessage: 'Containment plan saved.', onSuccess: (row) => query.setData(row) },
    );
  };

  return (
    <DataCard>
      <PanelHeading
        title="Containment plan"
        endpoint={`GET /applications/${appId}/containment-plan`}
        right={query.data ? <StatusBadge status="success" label="Filed" /> : undefined}
      />

      {query.loading && <LoadingBlock label="Loading containment plan…" />}
      {query.error && !query.error.isNotFound && (
        <ApiErrorState error={query.error} onRetry={query.refetch} />
      )}
      {query.error?.isNotFound && !canEdit && (
        <EmptyState title="No containment plan filed yet" hint="The owning officer files this before selection." />
      )}
      {query.error?.isNotFound && canEdit && !query.data && (
        <p className="text-xs text-[#6B6560] mb-3">
          No containment plan filed yet. Fill in the required fields below or use AI assist to generate a draft.
        </p>
      )}

      {!canEdit && query.data && (
        <div className="space-y-0">
          {CONTAINMENT_FIELDS.map((f) => (
            <KeyValue key={f.key} label={f.label} value={query.data?.[f.key]} />
          ))}
          <KeyValue label="Filed" value={fmtDateTime(query.data.created_at)} />
        </div>
      )}

      {canEdit && !query.loading && (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-[#6B6560] flex-1">
              A final risk profile must exist before this can be filed — the server
              rejects it otherwise. Submitting again updates the existing plan.
            </p>
            <DocButton
              type="button"
              size="sm"
              variant="secondary"
              role="officer"
              loading={assist.pending}
              onClick={runAssist}
            >
              Draft with AI assist
            </DocButton>
          </div>

          {assist.error && (
            <AlertStrip type="warning" title="Draft unavailable" message={assist.error.detail} />
          )}
          {assist.success && <AlertStrip type="info" message={assist.success} />}

          {CONTAINMENT_FIELDS.map((f) => (
            <label key={f.key} className="space-y-1 block">
              <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
                {f.label}
              </span>
              <DocTextarea
                rows={2}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </label>
          ))}

          <MutationFeedback state={save} />

          <DocButton
            type="submit"
            variant="primary"
            role="officer"
            size="sm"
            loading={save.pending}
            icon={<Save className="w-3 h-3" />}
          >
            {query.data ? 'Update plan' : 'File plan'}
          </DocButton>
        </form>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Decision readiness — GET /applications/{id}/decision-readiness
// ─────────────────────────────────────────────────────────────

const READINESS_CHECKS = [
  { key: 'eligibility_passed', label: 'Eligibility passed' },
  { key: 'stage3_scoring_complete', label: 'Technical scoring complete' },
  { key: 'no_unresolved_coi', label: 'No unresolved conflicts of interest' },
  { key: 'commercial_unlocked', label: 'Commercial stage unlocked' },
  { key: 'final_risk_profile_exists', label: 'Final risk profile computed' },
  { key: 'containment_plan_exists', label: 'Containment plan filed' },
] as const;

export const DecisionReadinessPanel: React.FC<{
  appId: number;
  /** Officer only: enables the select-for-pilot action. */
  canSelect?: boolean;
  /** Enables viewing the evaluator COI breakdown table (officers/admins). Decoupled from canSelect. */
  canViewCOI?: boolean;
  onSelected?: () => void;
}> = ({ appId, canSelect = false, canViewCOI, onSelected }) => {
  const query = useQuery(() => api.getDecisionReadiness(appId), [appId]);
  const coiQuery = useQuery(() => orNull(api.getCOIDeclarations(appId)), [appId]);
  const select = useMutation();

  const ready = query.data?.overall_ready ?? false;
  const showCOI = canViewCOI ?? canSelect;
  const coiList: COIDeclarationRead[] = coiQuery.data ?? [];

  return (
    <DataCard>
      <PanelHeading
        title="Decision readiness"
        endpoint={`GET /applications/${appId}/decision-readiness`}
        right={
          query.data ? (
            <StatusBadge
              status={ready ? 'success' : 'warning'}
              label={ready ? 'Ready to select' : 'Not ready'}
            />
          ) : undefined
        }
      />

      {query.loading && <LoadingBlock label="Evaluating gates…" />}
      {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {READINESS_CHECKS.map((check) => {
              const ok = query.data![check.key];
              return (
                <div
                  key={check.key}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: ok ? '#EAF7ED' : '#F8F6F1',
                    border: `1px solid ${ok ? '#B8E6C4' : '#E8E2D5'}`,
                  }}
                >
                  {ok ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1E9E5A] shrink-0" />
                  ) : (
                    <CircleDashed className="w-4 h-4 text-[#A89F94] shrink-0" />
                  )}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: ok ? '#1E9E5A' : '#6B6560' }}
                  >
                    {check.label}
                  </span>
                </div>
              );
            })}
          </div>

          {showCOI && coiList.length > 0 && (
            <div className="mt-4 space-y-2">
              <SectionDivider label="Evaluator COI Status Breakdown" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94] text-left">
                      <th className="pb-2 pr-3">Evaluator ID</th>
                      <th className="pb-2 pr-3">Conflict Declared</th>
                      <th className="pb-2 pr-3">Recused</th>
                      <th className="pb-2 pr-3">Declared At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1EDE4]">
                    {coiList.map((coi) => (
                      <tr key={coi.id}>
                        <td className="py-2 pr-3 font-mono">User #{coi.evaluator_id}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge
                            status={coi.declared_conflict ? 'error' : 'success'}
                            label={coi.declared_conflict ? 'Yes' : 'No'}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge
                            status={coi.recused ? 'warning' : 'info'}
                            label={coi.recused ? 'Recused' : 'Active'}
                          />
                        </td>
                        <td className="py-2 pr-3 text-[#6B6560]">{fmtDateTime(coi.declared_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {canSelect && (
            <div className="mt-4 space-y-3">
              <SectionDivider label="Selection" />
              <MutationFeedback state={select} />
              <p className="text-[11px] text-[#6B6560]">
                Selecting records a SelectionDecision and moves the application to
                <span className="font-bold"> selected</span>. The server re-checks every
                gate above and refuses if any fails.
              </p>
              <DocButton
                variant="primary"
                role="officer"
                size="sm"
                disabled={!ready}
                loading={select.pending}
                onClick={() =>
                  select.run(() => api.selectApplication(appId), {
                    successMessage: 'Application selected for the pilot.',
                    onSuccess: () => {
                      query.refetch();
                      onSelected?.();
                    },
                  })
                }
              >
                Select for pilot
              </DocButton>
            </div>
          )}
        </>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Sandbox trial — Layer 5, router not mounted
// ─────────────────────────────────────────────────────────────

const SANDBOX_CHECKS = [
  { key: 'functional_check', label: 'Functional' },
  { key: 'directional_kpi_check', label: 'Directional KPI' },
  { key: 'operational_fit_check', label: 'Operational fit' },
  { key: 'no_red_flags_check', label: 'No red flags' },
] as const;

export const SandboxTrialPanel: React.FC<{ appId: number; canRecord?: boolean }> = ({
  appId,
  canRecord = false,
}) => {
  const query = useQuery(() => api.getSandboxTrial(appId), [appId]);
  const create = useMutation();
  const finalize = useMutation();

  const [checks, setChecks] = useState<Record<string, SandboxCheckEnum>>({
    functional_check: 'pass',
    directional_kpi_check: 'pass',
    operational_fit_check: 'pass',
    no_red_flags_check: 'pass',
  });
  const [mode, setMode] = useState<VerificationModeEnum>('desk_review');
  const [notes, setNotes] = useState('');
  const [verdict, setVerdict] = useState<SandboxVerdictEnum | ''>('');

  const trial = query.data;

  return (
    <DataCard>
      <PanelHeading
        title="Sandbox trial"
        endpoint={`GET /applications/${appId}/sandbox-trial`}
        right={trial?.verdict ? <StatusBadge status="info" label={humanize(trial.verdict)} /> : undefined}
      />

      {query.loading && <LoadingBlock label="Loading sandbox trial…" />}
      {query.error && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="No sandbox trial recorded for this application"
        />
      )}

      {trial && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SANDBOX_CHECKS.map((c) => {
              const value = trial[c.key];
              const ok = value === 'pass';
              return (
                <div
                  key={c.key}
                  className="px-3 py-2 rounded-lg text-center"
                  style={{
                    backgroundColor: value ? (ok ? '#EAF7ED' : '#FEF2F2') : '#F8F6F1',
                    border: `1px solid ${value ? (ok ? '#B8E6C4' : '#FECACA') : '#E8E2D5'}`,
                  }}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#A89F94]">
                    {c.label}
                  </div>
                  <div
                    className="text-xs font-black uppercase mt-0.5"
                    style={{ color: value ? (ok ? '#1E9E5A' : '#DC2626') : '#A89F94' }}
                  >
                    {value ?? '—'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-0">
            <KeyValue label="Verdict" value={humanize(trial.verdict)} />
            <KeyValue label="Verification mode" value={humanize(trial.verification_mode)} />
            <KeyValue label="Verified by" value={trial.verified_by ? `User #${trial.verified_by}` : null} />
            <KeyValue label="Started" value={fmtDateTime(trial.started_at)} />
            <KeyValue label="Completed" value={fmtDateTime(trial.completed_at)} />
            <KeyValue label="Notes" value={trial.notes} />
          </div>
        </div>
      )}

      {/* Finalise an open trial. */}
      {canRecord && trial && !trial.completed_at && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            finalize.run(
              () => api.updateSandboxTrial(appId, trial.id, { verdict: verdict || null, notes: notes || null }),
              { successMessage: 'Trial finalised.', onSuccess: (row) => query.setData(row) },
            );
          }}
        >
          <SectionDivider label="Finalise trial" />
          <label className="space-y-1 block">
            <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
              Verdict
            </span>
            <DocSelect
              value={verdict}
              onChange={(e) => setVerdict(e.target.value as SandboxVerdictEnum | '')}
            >
              <option value="">Compute from the four checks</option>
              <option value="promising">Promising</option>
              <option value="not_promising">Not promising</option>
              <option value="inconclusive">Inconclusive</option>
            </DocSelect>
          </label>
          <DocTextarea
            rows={2}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <MutationFeedback state={finalize} />
          <DocButton
            type="submit"
            size="sm"
            variant="primary"
            role="independent-evaluator"
            loading={finalize.pending}
          >
            Finalise trial
          </DocButton>
        </form>
      )}

      {/* Open a new trial. */}
      {canRecord && !trial && !query.loading && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.run(
              () =>
                api.createSandboxTrial(appId, {
                  functional_check: checks.functional_check,
                  directional_kpi_check: checks.directional_kpi_check,
                  operational_fit_check: checks.operational_fit_check,
                  no_red_flags_check: checks.no_red_flags_check,
                  verification_mode: mode,
                  notes: notes || null,
                }),
              { successMessage: 'Sandbox trial recorded.', onSuccess: (row) => query.setData(row) },
            );
          }}
        >
          <SectionDivider label="Record trial" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SANDBOX_CHECKS.map((c) => (
              <label key={c.key} className="space-y-1 block">
                <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
                  {c.label}
                </span>
                <DocSelect
                  value={checks[c.key]}
                  onChange={(e) =>
                    setChecks((s) => ({ ...s, [c.key]: e.target.value as SandboxCheckEnum }))
                  }
                >
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </DocSelect>
              </label>
            ))}
          </div>

          <label className="space-y-1 block">
            <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
              Verification mode
            </span>
            <DocSelect
              value={mode}
              onChange={(e) => setMode(e.target.value as VerificationModeEnum)}
            >
              <option value="desk_review">Desk review</option>
              <option value="field_visit">Field visit</option>
            </DocSelect>
          </label>

          <DocTextarea
            rows={2}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <MutationFeedback state={create} />

          <DocButton
            type="submit"
            size="sm"
            variant="primary"
            role="independent-evaluator"
            loading={create.pending}
          >
            Record sandbox trial
          </DocButton>
        </form>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Contract — Layer 5, router not mounted
// ─────────────────────────────────────────────────────────────

export const ContractPanel: React.FC<{
  appId: number;
  canCreate?: boolean;
  onContract?: (contractId: number) => void;
}> = ({ appId, canCreate = false, onContract }) => {
  const query = useQuery(() => api.getContract(appId), [appId]);
  const create = useMutation();

  useEffect(() => {
    if (query.data) onContract?.(query.data.id);
  }, [query.data, onContract]);

  return (
    <DataCard>
      <PanelHeading
        title="Contract"
        endpoint={`GET /applications/${appId}/contract`}
        right={query.data ? <StatusBadge status="contracted" label={`Contract #${query.data.id}`} /> : undefined}
      />

      {query.loading && <LoadingBlock label="Loading contract…" rows={2} />}

      {query.error && !(query.error.isNotFound && canCreate) && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="No contract raised for this application yet"
        />
      )}

      {query.data && (
        <div className="space-y-3">
          <div className="space-y-0">
            <KeyValue label="Contract id" value={`#${query.data.id}`} />
            <KeyValue label="Initiated by" value={`User #${query.data.initiated_by}`} />
            <KeyValue label="Created" value={fmtDateTime(query.data.created_at)} />
            <KeyValue
              label="Signed"
              value={query.data.signed_at ? fmtDateTime(query.data.signed_at) : 'Not signed'}
            />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94] mb-1.5">
              Clause snapshot
            </div>
            <pre
              className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed"
              style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}
            >
              {JSON.stringify(query.data.clause_snapshot, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {canCreate && !query.data && !query.loading && (
        <div className="space-y-3">
          {query.error?.isNotFound && (
            <p className="text-xs text-[#6B6560]">
              No contract exists yet. Clauses are derived server-side from the problem
              statement&apos;s category — there is nothing to fill in.
            </p>
          )}
          <MutationFeedback state={create} />
          <DocButton
            size="sm"
            variant="primary"
            role="officer"
            loading={create.pending}
            onClick={() =>
              create.run(() => api.createContract(appId), {
                successMessage: 'Contract raised.',
                onSuccess: (row) => {
                  query.setData(row);
                  onContract?.(row.id);
                },
              })
            }
          >
            Raise contract
          </DocButton>
        </div>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Milestones — Layer 5, router not mounted
// ─────────────────────────────────────────────────────────────

export const MilestonesPanel: React.FC<{
  contractId: number;
  /** Officer: set due date, targets and display name. */
  canPlan?: boolean;
  /** Startup: attach evidence. */
  canSubmitEvidence?: boolean;
  /** Independent evaluator: accept/reject and set payment status. */
  canReview?: boolean;
}> = ({ contractId, canPlan = false, canSubmitEvidence = false, canReview = false }) => {
  const query = useQuery(() => api.getMilestones(contractId), [contractId]);
  const action = useMutation();

  const [plans, setPlans] = useState<
    Record<number, { due_date: string; target_value: string; target_unit: string; display_name: string }>
  >({});
  const [evidence, setEvidence] = useState<Record<number, string>>({});
  const [reviews, setReviews] = useState<
    Record<number, { status: MilestoneStatusEnum; payment_status: PaymentStatusEnum }>
  >({});

  const milestones = query.data ?? [];

  // Seed the per-row editors from the server rows.
  useEffect(() => {
    if (!query.data) return;
    setPlans(
      Object.fromEntries(
        query.data.map((m) => [
          m.id,
          {
            due_date: m.due_date ?? '',
            target_value: m.target_value ?? '',
            target_unit: m.target_unit ?? '',
            display_name: m.display_name ?? '',
          },
        ]),
      ),
    );
    setReviews(
      Object.fromEntries(
        query.data.map((m) => [
          m.id,
          {
            status: (m.status === 'submitted' ? 'accepted' : m.status) as MilestoneStatusEnum,
            payment_status: m.payment_status,
          },
        ]),
      ),
    );
  }, [query.data]);

  return (
    <DataCard>
      <PanelHeading
        title="Pilot milestones"
        endpoint={`GET /contracts/${contractId}/milestones`}
        right={
          milestones.length > 0 ? (
            <StatusBadge
              status="info"
              label={`${milestones.filter((m) => m.status === 'accepted').length}/${milestones.length} accepted`}
            />
          ) : undefined
        }
      />

      {query.loading && <LoadingBlock label="Loading milestones…" />}
      {query.error && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="No milestones found for this contract"
        />
      )}

      <MutationFeedback state={action} />

      <div className="divide-y divide-[#F1EDE4]">
        {milestones.map((m) => (
          <div key={m.id} className="py-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-bold text-[#1A1A1A]">
                  {m.display_name || humanize(m.milestone_type)}
                </div>
                <div className="text-[10px] text-[#A89F94] font-mono">
                  {humanize(m.milestone_type)} · milestone #{m.id}
                </div>
                <div className="text-[11px] text-[#6B6560] mt-0.5">
                  Due {fmtDate(m.due_date)}
                  {m.target_value ? ` · Target ${m.target_value} ${m.target_unit ?? ''}` : ''}
                  {m.submitted_value ? ` · Submitted ${m.submitted_value}` : ''}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge
                  status={
                    m.status === 'accepted'
                      ? 'success'
                      : m.status === 'rejected'
                        ? 'error'
                        : m.status === 'submitted'
                          ? 'info'
                          : 'pending'
                  }
                  label={humanize(m.status)}
                />
                <StatusBadge
                  status={m.payment_status === 'paid' ? 'success' : 'pending'}
                  label={`Payment ${humanize(m.payment_status)}`}
                  dot={false}
                />
              </div>
            </div>

            {canPlan && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <DocInput
                  lineStyle={false}
                  type="date"
                  aria-label="Due date"
                  value={plans[m.id]?.due_date ?? ''}
                  onChange={(e) =>
                    setPlans((p) => ({ ...p, [m.id]: { ...p[m.id], due_date: e.target.value } }))
                  }
                />
                <DocInput
                  lineStyle={false}
                  aria-label="Target value"
                  placeholder="Target value"
                  value={plans[m.id]?.target_value ?? ''}
                  onChange={(e) =>
                    setPlans((p) => ({ ...p, [m.id]: { ...p[m.id], target_value: e.target.value } }))
                  }
                />
                <DocInput
                  lineStyle={false}
                  aria-label="Target unit"
                  placeholder="Unit"
                  value={plans[m.id]?.target_unit ?? ''}
                  onChange={(e) =>
                    setPlans((p) => ({ ...p, [m.id]: { ...p[m.id], target_unit: e.target.value } }))
                  }
                />
                <DocButton
                  size="sm"
                  variant="secondary"
                  role="officer"
                  disabled={action.pending}
                  onClick={() =>
                    action.run(
                      () =>
                        api.updateMilestone(contractId, m.id, {
                          due_date: plans[m.id]?.due_date || null,
                          target_value: plans[m.id]?.target_value || null,
                          target_unit: plans[m.id]?.target_unit || null,
                          display_name: plans[m.id]?.display_name || null,
                        }),
                      { successMessage: 'Milestone updated.', onSuccess: () => query.refetch() },
                    )
                  }
                >
                  Save
                </DocButton>
              </div>
            )}

            {canSubmitEvidence && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <DocInput
                    lineStyle={false}
                    aria-label={`Evidence reference for milestone ${m.id}`}
                    placeholder="Evidence URL or storage reference"
                    value={evidence[m.id] ?? ''}
                    onChange={(e) => setEvidence((s) => ({ ...s, [m.id]: e.target.value }))}
                  />
                </div>
                <DocButton
                  size="sm"
                  variant="secondary"
                  role="startup"
                  disabled={!(evidence[m.id] ?? '').trim() || action.pending}
                  icon={<Upload className="w-3 h-3" />}
                  onClick={() =>
                    action.run(
                      () =>
                        api.submitEvidence(contractId, m.id, {
                          file_reference: (evidence[m.id] ?? '').trim(),
                        }),
                      {
                        successMessage: 'Evidence submitted.',
                        onSuccess: () => {
                          setEvidence((s) => ({ ...s, [m.id]: '' }));
                          query.refetch();
                        },
                      },
                    )
                  }
                >
                  Submit evidence
                </DocButton>
              </div>
            )}

            {canReview && m.status === 'submitted' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <DocSelect
                  aria-label="Review outcome"
                  value={reviews[m.id]?.status ?? 'accepted'}
                  onChange={(e) =>
                    setReviews((r) => ({
                      ...r,
                      [m.id]: { ...r[m.id], status: e.target.value as MilestoneStatusEnum },
                    }))
                  }
                >
                  <option value="accepted">Accept</option>
                  <option value="rejected">Reject</option>
                </DocSelect>
                <DocSelect
                  aria-label="Payment status"
                  value={reviews[m.id]?.payment_status ?? 'not_due'}
                  onChange={(e) =>
                    setReviews((r) => ({
                      ...r,
                      [m.id]: { ...r[m.id], payment_status: e.target.value as PaymentStatusEnum },
                    }))
                  }
                >
                  <option value="not_due">Payment not due</option>
                  <option value="due">Payment due</option>
                  <option value="paid">Paid</option>
                </DocSelect>
                <DocButton
                  size="sm"
                  variant="primary"
                  role="independent-evaluator"
                  disabled={action.pending}
                  onClick={() =>
                    action.run(
                      () =>
                        api.reviewMilestone(contractId, m.id, {
                          status: reviews[m.id]?.status ?? 'accepted',
                          payment_status: reviews[m.id]?.payment_status ?? 'not_due',
                        }),
                      { successMessage: 'Milestone reviewed.', onSuccess: () => query.refetch() },
                    )
                  }
                >
                  Record review
                </DocButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// KPI verdicts — Layer 5, router not mounted
// ─────────────────────────────────────────────────────────────

export const KPIVerdictsPanel: React.FC<{
  contractId: number;
  /** KPIs belong to the problem statement, so the id is needed to name them. */
  problemStatementId?: number;
  canRecord?: boolean;
}> = ({ contractId, problemStatementId, canRecord = false }) => {
  const query = useQuery(() => api.getKPIVerdicts(contractId), [contractId]);
  const kpis = useQuery(() => api.getKPIs(problemStatementId!), [problemStatementId], {
    enabled: Boolean(problemStatementId),
  });
  const record = useMutation();

  const [kpiId, setKpiId] = useState('');
  const [verdict, setVerdict] = useState<KPIVerdictResultEnum>('met');
  const [mode, setMode] = useState<VerificationModeEnum>('desk_review');
  const [justification, setJustification] = useState('');

  const kpiById = new Map((kpis.data ?? []).map((k) => [k.id, k]));
  const verdicts = query.data ?? [];
  const alreadyJudged = new Set(verdicts.map((v) => v.kpi_id));
  const remaining = (kpis.data ?? []).filter((k) => !alreadyJudged.has(k.id));

  return (
    <DataCard>
      <PanelHeading
        title="KPI verdicts"
        endpoint={`GET /contracts/${contractId}/kpi-verdicts`}
        right={
          kpis.data ? (
            <StatusBadge status="info" label={`${verdicts.length}/${kpis.data.length} judged`} />
          ) : undefined
        }
      />

      {query.loading && <LoadingBlock label="Loading verdicts…" />}
      {query.error && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="No KPI verdicts recorded yet"
        />
      )}

      {query.data && verdicts.length === 0 && (
        <EmptyState
          title="No verdicts recorded yet"
          hint="An independent evaluator records one verdict per KPI on the problem statement."
        />
      )}

      <div className="divide-y divide-[#F1EDE4]">
        {verdicts.map((v) => {
          const kpi = kpiById.get(v.kpi_id);
          const met = v.verdict === 'met';
          return (
            <div key={v.id} className="py-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1A1A1A]">
                  {kpi?.name ?? `KPI #${v.kpi_id}`}
                </div>
                {kpi && (
                  <div className="text-[11px] text-[#6B6560]">
                    Baseline {kpi.baseline || '—'} → target {kpi.target || '—'}
                  </div>
                )}
                {v.justification && (
                  <p className="text-[11px] text-[#6B6560] leading-relaxed mt-1">
                    {v.justification}
                  </p>
                )}
                <div className="text-[10px] text-[#A89F94] mt-0.5">
                  {humanize(v.verification_mode)} · verified by user #{v.verified_by} on{' '}
                  {fmtDateTime(v.verified_at)}
                </div>
              </div>
              <StatusBadge
                status={met ? 'success' : 'error'}
                label={met ? 'Met' : 'Not met'}
              />
            </div>
          );
        })}
      </div>

      {canRecord && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!kpiId) return;
            record.run(
              () =>
                api.submitKPIVerdict(contractId, {
                  kpi_id: Number(kpiId),
                  verdict,
                  verification_mode: mode,
                  justification: justification || null,
                }),
              {
                successMessage: 'Verdict recorded.',
                onSuccess: () => {
                  setKpiId('');
                  setJustification('');
                  query.refetch();
                },
              },
            );
          }}
        >
          <SectionDivider label="Record a verdict" />

          {!problemStatementId && (
            <AlertStrip
              type="info"
              message="Open this from an application so the problem statement's KPIs can be listed."
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 block sm:col-span-3">
              <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
                KPI
              </span>
              <DocSelect value={kpiId} onChange={(e) => setKpiId(e.target.value)} required>
                <option value="">Select a KPI…</option>
                {remaining.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </DocSelect>
            </label>

            <label className="space-y-1 block">
              <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
                Verdict
              </span>
              <DocSelect
                value={verdict}
                onChange={(e) => setVerdict(e.target.value as KPIVerdictResultEnum)}
              >
                <option value="met">Met</option>
                <option value="not_met">Not met</option>
              </DocSelect>
            </label>

            <label className="space-y-1 block sm:col-span-2">
              <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
                Verification mode
              </span>
              <DocSelect
                value={mode}
                onChange={(e) => setMode(e.target.value as VerificationModeEnum)}
              >
                <option value="desk_review">Desk review</option>
                <option value="field_visit">Field visit</option>
              </DocSelect>
            </label>
          </div>

          <DocTextarea
            rows={2}
            placeholder="Justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />

          <MutationFeedback state={record} />

          <DocButton
            type="submit"
            size="sm"
            variant="primary"
            role="independent-evaluator"
            loading={record.pending}
            disabled={!kpiId}
          >
            Record verdict
          </DocButton>
        </form>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Pilot outcome — Layer 5, router not mounted
// ─────────────────────────────────────────────────────────────

export const PilotOutcomePanel: React.FC<{ contractId: number; canDecide?: boolean }> = ({
  contractId,
  canDecide = false,
}) => {
  const query = useQuery(() => api.getPilotOutcome(contractId), [contractId]);
  const decide = useMutation();

  const [result, setResult] = useState<PilotOutcomeResultEnum>('scale');
  const [rationale, setRationale] = useState('');

  const outcome = query.data;

  return (
    <DataCard>
      <PanelHeading
        title="Pilot outcome"
        endpoint={`GET /contracts/${contractId}/pilot-outcome`}
        right={
          outcome ? (
            <StatusBadge
              status={
                outcome.overall_result === 'scale'
                  ? 'success'
                  : outcome.overall_result === 'stop'
                    ? 'error'
                    : 'warning'
              }
              label={humanize(outcome.overall_result)}
            />
          ) : undefined
        }
      />

      {query.loading && <LoadingBlock label="Loading outcome…" rows={2} />}
      {query.error && !(query.error.isNotFound && canDecide) && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="No outcome recorded yet"
        />
      )}

      {outcome && (
        <div className="space-y-0">
          <KeyValue label="Decision" value={humanize(outcome.overall_result)} />
          <KeyValue label="Rationale" value={outcome.rationale} />
          <KeyValue label="Decided by" value={`User #${outcome.decided_by}`} />
          <KeyValue label="Decided at" value={fmtDateTime(outcome.decided_at)} />
        </div>
      )}

      {canDecide && !outcome && !query.loading && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            decide.run(
              () => api.createPilotOutcome(contractId, { overall_result: result, rationale: rationale || null }),
              { successMessage: 'Outcome recorded.', onSuccess: (row) => query.setData(row) },
            );
          }}
        >
          <p className="text-xs text-[#6B6560]">
            A human decision, not a computed one — scale, iterate or stop, with the
            reasoning recorded alongside it.
          </p>

          <label className="space-y-1 block">
            <span className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
              Decision
            </span>
            <DocSelect
              value={result}
              onChange={(e) => setResult(e.target.value as PilotOutcomeResultEnum)}
            >
              <option value="scale">Scale</option>
              <option value="iterate">Iterate</option>
              <option value="stop">Stop</option>
            </DocSelect>
          </label>

          <DocTextarea
            rows={3}
            placeholder="Rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />

          <MutationFeedback state={decide} />

          <DocButton
            type="submit"
            size="sm"
            variant="primary"
            role="officer"
            loading={decide.pending}
          >
            Record outcome
          </DocButton>
        </form>
      )}
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Startup profile (reviewer view) — GET /startup/profile/{user_id}
// ─────────────────────────────────────────────────────────────

export const StartupProfilePanel: React.FC<{ startupId: number }> = ({ startupId }) => {
  const query = useQuery(() => api.getStartupProfile(startupId), [startupId]);

  return (
    <DataCard>
      <PanelHeading title="Startup profile" endpoint={`GET /startup/profile/${startupId}`} />

      {query.loading && <LoadingBlock label="Loading profile…" />}
      {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && (
        <div className="space-y-0">
          <KeyValue label="Name" value={query.data.name} />
          <KeyValue label="Email" value={query.data.email} />
          <KeyValue label="Entity type" value={query.data.entity_type} />
          <KeyValue label="DPIIT number" value={query.data.dpiit_number} />
          <KeyValue label="DPIIT status" value={humanize(query.data.dpiit_status)} />
          <KeyValue label="Stage" value={query.data.stage} />
          <KeyValue label="Website" value={query.data.website} />
          <KeyValue label="Sector tags" value={(query.data.sector_tags ?? []).join(', ')} />
          <KeyValue label="Team headcount" value={query.data.team_headcount} />
          <KeyValue label="TRL stage" value={query.data.trl_stage} />
          <KeyValue label="Tech stack" value={(query.data.tech_stack ?? []).join(', ')} />
          <KeyValue
            label="Architecture"
            value={(query.data.architecture ?? []).map(humanize).join(', ')}
          />
          <KeyValue label="API available" value={query.data.api_available ? 'Yes' : 'No'} />
          <KeyValue label="Description" value={query.data.description} />
          <KeyValue
            label="Compliance verified"
            value={
              query.data.compliance_verified_at
                ? fmtDateTime(query.data.compliance_verified_at)
                : 'Not verified'
            }
          />
        </div>
      )}

      <p className="text-[10px] text-[#A89F94] italic mt-3">
        Funding band is deliberately not shown here — it is a risk-profiling input
        only and must not influence scoring.
      </p>
    </DataCard>
  );
};

// ─────────────────────────────────────────────────────────────
// Proposal (the two JSON blobs on the Application row)
// ─────────────────────────────────────────────────────────────

export const ProposalPanel: React.FC<{
  technical?: Record<string, unknown> | null;
  commercial?: Record<string, unknown> | null;
  /** Commercial stays sealed until the officer unlocks that stage. */
  showCommercial?: boolean;
}> = ({ technical, commercial, showCommercial = true }) => (
  <DataCard>
    <PanelHeading title="Submitted proposal" endpoint="Application.technical_proposal / .commercial_proposal" />

    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94] mb-1.5">
          Technical
        </div>
        {technical && Object.keys(technical).length > 0 ? (
          <div className="space-y-0">
            {Object.entries(technical).map(([k, v]) => (
              <KeyValue key={k} label={humanize(k)} value={v == null ? null : String(v)} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#6B6560]">No technical proposal recorded.</p>
        )}
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94] mb-1.5">
          Commercial
        </div>
        {!showCommercial ? (
          <AlertStrip
            type="info"
            message="Sealed until the commercial stage is unlocked for this problem statement."
          />
        ) : commercial && Object.keys(commercial).length > 0 ? (
          <div className="space-y-0">
            {Object.entries(commercial).map(([k, v]) => (
              <KeyValue key={k} label={humanize(k)} value={v == null ? null : String(v)} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#6B6560]">No commercial proposal recorded.</p>
        )}
      </div>
    </div>
  </DataCard>
);
