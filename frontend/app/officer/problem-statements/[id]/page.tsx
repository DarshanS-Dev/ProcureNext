'use client';

/**
 * One problem statement, from the owning officer's side. Every route that hangs
 * off /problem-statements/{id} is reachable from here:
 *
 *   PATCH  /problem-statements/{id}                 (Details tab)
 *   POST   /problem-statements/{id}/publish|close   (header actions)
 *   POST   /problem-statements/{id}/ai-assist       (Details tab)
 *   GET/POST /problem-statements/{id}/kpis          (KPIs tab)
 *   GET    /problem-statements/{id}/evaluators      (Evaluators tab)
 *   GET    /problem-statements/{id}/matches         (Matching tab)
 *   GET/POST /problem-statements/{id}/invites       (Matching tab)
 *   GET    /applications?problem_statement_id={id}  (Applications tab)
 *   GET    /problem-statements/{id}/qcbs-ranking    (Ranking tab)
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocInput,
  DocLinkButton,
  DocSelect,
  DocTextarea,
  FormField,
  PageHeader,
  SectionDivider,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { useTabParam } from '@/components/shared/Tabs';
import {
  CapsuleBarChart,
  IconBadge,
  PillTabs,
  ProgressCapsule,
  StatPill,
} from '@/components/shared/design-system';
import { ApplicationStatusDonut } from '@/components/shared/domain/Insights';
import { Lock, LockOpen, Mail, PieChart, ShieldCheck } from 'lucide-react';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  fmtDate,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import { PanelHeading } from '@/components/panels/ApplicationPanels';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import {
  BUDGET_RANGE_VALUES,
  BudgetRangeEnum,
  CATEGORY_VALUES,
  CategoryEnum,
  ProblemStatementRead,
} from '@/lib/types/api';
import { ArrowRight, Save, Send, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'kpis', label: 'KPIs' },
  { id: 'evaluators', label: 'Evaluators' },
  { id: 'matching', label: 'Matching & invites' },
  { id: 'applications', label: 'Applications' },
  { id: 'ranking', label: 'QCBS ranking' },
];

const parseList = (raw: string) =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function PSDetail({ psId }: { psId: number }) {
  const session = useSession();
  const { active, setActive } = useTabParam(TABS);
  const psQuery = useQuery(() => api.getProblemStatement(psId), [psId]);
  const lifecycle = useMutation();

  const ps = psQuery.data;
  const isOwner = Boolean(session && ps && ps.officer_id === session.userId);

  if (psQuery.loading) return <LoadingBlock label="Loading problem statement…" />;
  if (psQuery.error) return <ApiErrorState error={psQuery.error} onRetry={psQuery.refetch} />;
  if (!ps) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ps.title}
        subtitle={`${humanize(ps.category)}${ps.budget_range ? ` · ${humanize(ps.budget_range)}` : ''} · Created ${fmtDate(ps.created_at)}`}
        phase={`PS #${ps.id}`}
        role="officer"
        breadcrumb={[
          { label: 'Officer', href: '/officer/dashboard' },
          { label: 'Problem statements', href: '/officer/problem-statements' },
          { label: `#${ps.id}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={ps.status} />
            {isOwner && ps.status === 'draft' && (
              <DocButton
                size="sm"
                variant="primary"
                role="officer"
                loading={lifecycle.pending}
                icon={<Send className="w-3 h-3" />}
                onClick={() =>
                  lifecycle.run(() => api.publishProblemStatement(psId), {
                    successMessage: 'Published — startups can now apply.',
                    onSuccess: (row) => psQuery.setData(row),
                  })
                }
              >
                Publish
              </DocButton>
            )}
            {isOwner && ps.status === 'published' && (
              <DocButton
                size="sm"
                variant="danger"
                loading={lifecycle.pending}
                onClick={() =>
                  lifecycle.run(() => api.closeProblemStatement(psId), {
                    successMessage: 'Closed to new applications.',
                    onSuccess: (row) => psQuery.setData(row),
                  })
                }
              >
                Close
              </DocButton>
            )}
          </div>
        }
      />

      {lifecycle.error && (
        <AlertStrip type="error" title="Action failed" message={lifecycle.error.detail} />
      )}
      {lifecycle.success && <AlertStrip type="success" message={lifecycle.success} />}

      {!isOwner && (
        <AlertStrip
          type="info"
          title="Read only"
          message={`This problem statement belongs to officer #${ps.officer_id}. You can view it, but every write here will be refused by the server.`}
        />
      )}

      {/* Which of the bid-defining fields are still editable — driven by the
          computed `is_locked_field_editable` flag, not a guess. */}
      <div className="flex items-center gap-2 flex-wrap">
        {['Title', 'Category', 'KPIs', 'Eligibility'].map((field) => (
          <span
            key={field}
            className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1.5 rounded-full ${
              ps.is_locked_field_editable
                ? 'bg-[#F3F3EE] text-[#6B7280]'
                : 'bg-[#18181B] text-white'
            }`}
            title={
              ps.is_locked_field_editable
                ? 'Still editable — no applications yet'
                : 'Locked — applications were bid against this'
            }
          >
            {ps.is_locked_field_editable ? (
              <LockOpen className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            {field}
          </span>
        ))}
      </div>

      <PillTabs tabs={TABS} active={active} onChange={setActive} />

      {active === 'details' && (
        <DetailsTab ps={ps} canEdit={isOwner} onSaved={(row) => psQuery.setData(row)} />
      )}
      {active === 'kpis' && <KPIsTab psId={psId} canEdit={isOwner} />}
      {active === 'evaluators' && <EvaluatorsTab psId={psId} />}
      {active === 'matching' && <MatchingTab psId={psId} canInvite={isOwner} />}
      {active === 'applications' && <ApplicationsTab psId={psId} />}
      {active === 'ranking' && <RankingTab psId={psId} />}
    </div>
  );
}

// ── Details ──────────────────────────────────────────────────

const DetailsTab: React.FC<{
  ps: ProblemStatementRead;
  canEdit: boolean;
  onSaved: (row: ProblemStatementRead) => void;
}> = ({ ps, canEdit, onSaved }) => {
  const save = useMutation();
  const assist = useMutation();

  const [form, setForm] = useState({
    title: ps.title,
    description: ps.description ?? '',
    category: ps.category,
    target_beneficiaries: ps.target_beneficiaries ?? '',
    baseline: ps.baseline ?? '',
    target: ps.target ?? '',
    measurement_method: ps.measurement_method ?? '',
    measurement_period: ps.measurement_period ?? '',
    budget_range: (ps.budget_range ?? '') as BudgetRangeEnum | '',
    budget_description: ps.budget_description ?? '',
    sensitivity_flags: (ps.sensitivity_flags ?? []).join(', '),
    success_condition: ps.success_condition ?? '',
    additional_required_documents: (ps.additional_required_documents ?? []).join(', '),
  });

  const [roughText, setRoughText] = useState('');
  const [advice, setAdvice] = useState<null | {
    suggested_baseline_question?: string | null;
    suggested_measurement_method?: string | null;
    is_outcome_based: boolean;
    rewrite_suggestion?: string | null;
  }>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.run(
      () =>
        api.updateProblemStatement(ps.id, {
          title: form.title,
          description: form.description || null,
          category: form.category,
          target_beneficiaries: form.target_beneficiaries || null,
          baseline: form.baseline || null,
          target: form.target || null,
          measurement_method: form.measurement_method || null,
          measurement_period: form.measurement_period || null,
          budget_range: form.budget_range || null,
          budget_description: form.budget_description || null,
          sensitivity_flags: form.sensitivity_flags ? parseList(form.sensitivity_flags) : null,
          success_condition: form.success_condition || null,
          additional_required_documents: form.additional_required_documents
            ? parseList(form.additional_required_documents)
            : null,
        }),
      { successMessage: 'Problem statement updated.', onSuccess: onSaved },
    );
  };

  // The only two fields that actually block publishing (Doc B L2 #2/#3).
  // Everything else the assist says is advisory, so it never turns this red.
  const gates = [
    { label: 'Baseline', done: Boolean(form.baseline.trim()) },
    { label: 'Measurement method', done: Boolean(form.measurement_method.trim()) },
  ];
  const gatesPassed = gates.filter((g) => g.done).length;

  return (
    <div className="space-y-5">
      {!ps.is_locked_field_editable && (
        <AlertStrip
          type="warning"
          title="Locked fields"
          message="Applications already exist for this problem statement, so the fields that define what was bid against can no longer be changed. The server rejects those edits."
        />
      )}

      <DataCard>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <IconBadge size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#18181B]">
              Publish quality gate
            </span>
          </div>
          <StatPill tone={gatesPassed === gates.length ? 'ok' : 'warn'}>
            {gatesPassed} / {gates.length}
          </StatPill>
        </div>

        <ProgressCapsule
          filled={gatesPassed}
          total={gates.length}
          labels={gates.map((g) => g.label)}
        />

        <div className="mt-4 space-y-1.5">
          {gates.map((gate) => (
            <div key={gate.label} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: gate.done ? '#1E9E5A' : '#C81E4A' }}
              />
              <span className={gate.done ? 'text-[#18181B] font-semibold' : 'text-[#C81E4A] font-semibold'}>
                {gate.label}
              </span>
              <span className="text-gray-400">
                {gate.done ? 'present' : 'required before publishing'}
              </span>
            </div>
          ))}
        </div>

        {advice && !advice.is_outcome_based && (
          <div className="mt-3">
            <StatPill tone="warn">Advisory — reads as a technology spec</StatPill>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              Non-blocking. You can publish with this flag set.
            </p>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
          These are the only two fields the server refuses to publish without.
        </p>
      </DataCard>

      {canEdit && (
        <DataCard>
          <PanelHeading
            title="AI assist"
            endpoint={`POST /problem-statements/${ps.id}/ai-assist`}
          />
          <p className="text-xs text-[#6B6560] mb-3">
            Advisory only — it writes nothing and never blocks publishing. Paste the
            rough version and it tells you whether it reads as an outcome or a spec.
          </p>
          <div className="space-y-3">
            <DocTextarea
              rows={3}
              placeholder="Paste the rough problem description here…"
              value={roughText}
              onChange={(e) => setRoughText(e.target.value)}
            />
            <DocButton
              size="sm"
              variant="secondary"
              role="officer"
              loading={assist.pending}
              disabled={!roughText.trim()}
              icon={<Sparkles className="w-3 h-3" />}
              onClick={() =>
                assist.run(() => api.problemStatementAiAssist(ps.id, { rough_text: roughText }), {
                  successMessage: 'Suggestions below.',
                  onSuccess: setAdvice,
                })
              }
            >
              Get suggestions
            </DocButton>

            {assist.error && (
              <AlertStrip type="error" title="Assist failed" message={assist.error.detail} />
            )}

            {advice && (
              <div className="space-y-2">
                <AlertStrip
                  type={advice.is_outcome_based ? 'success' : 'warning'}
                  title={advice.is_outcome_based ? 'Reads as outcome-based' : 'Reads as a technology spec'}
                  message={
                    advice.is_outcome_based
                      ? 'This describes the result you want rather than the product you imagine.'
                      : 'Consider restating this as the outcome you need. You can publish either way.'
                  }
                />
                {advice.rewrite_suggestion && (
                  <SuggestionRow
                    label="Suggested rewrite"
                    value={advice.rewrite_suggestion}
                    onUse={() => set('description', advice.rewrite_suggestion!)}
                  />
                )}
                {advice.suggested_baseline_question && (
                  <SuggestionRow
                    label="Baseline question to answer"
                    value={advice.suggested_baseline_question}
                    onUse={() => set('baseline', advice.suggested_baseline_question!)}
                  />
                )}
                {advice.suggested_measurement_method && (
                  <SuggestionRow
                    label="Suggested measurement method"
                    value={advice.suggested_measurement_method}
                    onUse={() => set('measurement_method', advice.suggested_measurement_method!)}
                  />
                )}
              </div>
            )}
          </div>
        </DataCard>
      )}

      <DataCard>
        <PanelHeading title="Details" endpoint={`PATCH /problem-statements/${ps.id}`} />

        <form onSubmit={submit} className="space-y-5">
          <FormField label="Title" required>
            <DocInput
              required
              disabled={!canEdit}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Category" required>
              <DocSelect
                disabled={!canEdit}
                value={form.category}
                onChange={(e) => set('category', e.target.value as CategoryEnum)}
              >
                {CATEGORY_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {humanize(c)}
                  </option>
                ))}
              </DocSelect>
            </FormField>
            <FormField label="Budget range">
              <DocSelect
                disabled={!canEdit}
                value={form.budget_range}
                onChange={(e) => set('budget_range', e.target.value as BudgetRangeEnum | '')}
              >
                <option value="">Not set</option>
                {BUDGET_RANGE_VALUES.map((b) => (
                  <option key={b} value={b}>
                    {humanize(b)}
                  </option>
                ))}
              </DocSelect>
            </FormField>
          </div>

          <FormField label="Description">
            <DocTextarea
              rows={4}
              lineStyle
              disabled={!canEdit}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </FormField>

          <FormField label="Target beneficiaries">
            <DocInput
              disabled={!canEdit}
              value={form.target_beneficiaries}
              onChange={(e) => set('target_beneficiaries', e.target.value)}
            />
          </FormField>

          <SectionDivider label="Measurement" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Baseline">
              <DocInput
                disabled={!canEdit}
                value={form.baseline}
                onChange={(e) => set('baseline', e.target.value)}
              />
            </FormField>
            <FormField label="Target">
              <DocInput
                disabled={!canEdit}
                value={form.target}
                onChange={(e) => set('target', e.target.value)}
              />
            </FormField>
            <FormField label="Measurement method">
              <DocInput
                disabled={!canEdit}
                value={form.measurement_method}
                onChange={(e) => set('measurement_method', e.target.value)}
              />
            </FormField>
            <FormField label="Measurement period">
              <DocInput
                disabled={!canEdit}
                value={form.measurement_period}
                onChange={(e) => set('measurement_period', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Success condition">
            <DocTextarea
              rows={2}
              disabled={!canEdit}
              value={form.success_condition}
              onChange={(e) => set('success_condition', e.target.value)}
            />
          </FormField>

          <SectionDivider label="Procurement detail" />

          <FormField label="Budget narrative">
            <DocTextarea
              rows={2}
              disabled={!canEdit}
              value={form.budget_description}
              onChange={(e) => set('budget_description', e.target.value)}
            />
          </FormField>

          <FormField label="Sensitivity flags" hint="Comma separated">
            <DocInput
              disabled={!canEdit}
              value={form.sensitivity_flags}
              onChange={(e) => set('sensitivity_flags', e.target.value)}
            />
          </FormField>

          <FormField label="Additional required documents" hint="Comma separated">
            <DocInput
              disabled={!canEdit}
              value={form.additional_required_documents}
              onChange={(e) => set('additional_required_documents', e.target.value)}
            />
          </FormField>

          {save.error && <AlertStrip type="error" title="Not saved" message={save.error.detail} />}
          {save.success && <AlertStrip type="success" message={save.success} />}

          {canEdit && (
            <DocButton
              type="submit"
              variant="primary"
              role="officer"
              size="sm"
              loading={save.pending}
              icon={<Save className="w-3 h-3" />}
            >
              Save changes
            </DocButton>
          )}
        </form>
      </DataCard>
    </div>
  );
};

const SuggestionRow: React.FC<{ label: string; value: string; onUse: () => void }> = ({
  label,
  value,
  onUse,
}) => (
  <div
    className="p-3 rounded-lg flex items-start justify-between gap-3"
    style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}
  >
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94]">{label}</div>
      <p className="text-xs text-[#1A1A1A] leading-relaxed mt-0.5">{value}</p>
    </div>
    <DocButton size="sm" variant="ghost" onClick={onUse}>
      Use
    </DocButton>
  </div>
);

// ── KPIs ─────────────────────────────────────────────────────

const KPIsTab: React.FC<{ psId: number; canEdit: boolean }> = ({ psId, canEdit }) => {
  const query = useQuery(() => api.getKPIs(psId), [psId]);
  const create = useMutation();

  const [name, setName] = useState('');
  const [baseline, setBaseline] = useState('');
  const [target, setTarget] = useState('');
  const [method, setMethod] = useState('');

  return (
    <DataCard>
      <PanelHeading title="KPIs" endpoint={`GET /problem-statements/${psId}/kpis`} />

      <p className="text-xs text-[#6B6560] mb-4">
        These are what an independent evaluator records a met / not-met verdict
        against once the pilot is running. Add them before the pilot starts.
      </p>

      {query.loading && <LoadingBlock label="Loading KPIs…" rows={2} />}
      {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && query.data.length === 0 && (
        <EmptyState title="No KPIs defined yet" hint="Without KPIs there is nothing to verify at the end of the pilot." />
      )}

      <div className="divide-y divide-[#F1EDE4]">
        {(query.data ?? []).map((kpi) => (
          <div key={kpi.id} className="py-3">
            <div className="text-xs font-bold text-[#1A1A1A]">{kpi.name}</div>
            <div className="text-[11px] text-[#6B6560] mt-0.5">
              Baseline {kpi.baseline || '—'} → target {kpi.target || '—'}
              {kpi.measurement_method ? ` · measured by ${kpi.measurement_method}` : ''}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.run(
              () =>
                api.createKPI(psId, {
                  name,
                  baseline: baseline || null,
                  target: target || null,
                  measurement_method: method || null,
                }),
              {
                successMessage: 'KPI added.',
                onSuccess: () => {
                  setName('');
                  setBaseline('');
                  setTarget('');
                  setMethod('');
                  query.refetch();
                },
              },
            );
          }}
        >
          <SectionDivider label="Add a KPI" />

          <FormField label="Name" required>
            <DocInput required value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Baseline">
              <DocInput value={baseline} onChange={(e) => setBaseline(e.target.value)} />
            </FormField>
            <FormField label="Target">
              <DocInput value={target} onChange={(e) => setTarget(e.target.value)} />
            </FormField>
            <FormField label="Measurement method">
              <DocInput value={method} onChange={(e) => setMethod(e.target.value)} />
            </FormField>
          </div>

          {create.error && <AlertStrip type="error" title="Not added" message={create.error.detail} />}
          {create.success && <AlertStrip type="success" message={create.success} />}

          <DocButton
            type="submit"
            size="sm"
            variant="primary"
            role="officer"
            loading={create.pending}
            disabled={!name.trim()}
          >
            Add KPI
          </DocButton>
        </form>
      )}
    </DataCard>
  );
};

// ── Evaluators ───────────────────────────────────────────────

const EvaluatorsTab: React.FC<{ psId: number }> = ({ psId }) => {
  const query = useQuery(() => api.getEvaluatorAssignments(psId), [psId]);

  return (
    <DataCard>
      <PanelHeading
        title="Assigned evaluators"
        endpoint={`GET /problem-statements/${psId}/evaluators`}
      />

      <AlertStrip
        type="info"
        title="Assignment is an admin action"
        message="Officers can see the panel but cannot change it — POST /problem-statements/{id}/evaluators and .../replace are admin-only. Ask an admin to assign or replace an evaluator."
      />

      <div className="mt-4">
        {query.loading && <LoadingBlock label="Loading panel…" rows={2} />}
        {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

        {query.data && query.data.length === 0 && (
          <EmptyState
            title="No evaluators assigned"
            hint="A problem statement can be published with zero evaluators, but nothing can be scored until an admin assigns some."
          />
        )}

        <div className="divide-y divide-[#F1EDE4]">
          {(query.data ?? []).map((a) => (
            <div key={a.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#1A1A1A]">Evaluator #{a.evaluator_id}</div>
                <div className="text-[11px] text-[#6B6560]">
                  Assigned by user #{a.assigned_by} on {fmtDateTime(a.assigned_at)}
                </div>
              </div>
              <StatusBadge status="info" label={`Assignment #${a.id}`} />
            </div>
          ))}
        </div>
      </div>
    </DataCard>
  );
};

// ── Matching & invites ───────────────────────────────────────

const MatchingTab: React.FC<{ psId: number; canInvite: boolean }> = ({ psId, canInvite }) => {
  const matches = useQuery(() => api.getPSMatches(psId), [psId]);
  const invites = useQuery(() => api.getPSInvites(psId), [psId]);
  const invite = useMutation();

  const invitedIds = new Set((invites.data ?? []).map((i) => i.startup_id));

  return (
    <div className="space-y-5">
      <DataCard>
        <PanelHeading
          title="Semantic matches"
          endpoint={`GET /problem-statements/${psId}/matches`}
        />
        <p className="text-xs text-[#6B6560] mb-3">
          Startups ranked by how well their Level 2 capability description matches
          this problem statement. Inviting one is a nudge, not a shortlist — anyone
          can still apply.
        </p>

        {matches.loading && <LoadingBlock label="Ranking startups…" />}
        {matches.error && <ApiErrorState error={matches.error} onRetry={matches.refetch} />}

        {matches.data && matches.data.matches.length === 0 && (
          <EmptyState
            title="No matches"
            hint="No startup has a Level 2 description close enough to rank against this problem statement yet."
          />
        )}

        {/* Ordering only. The matching service returns ranked ids, not
            similarity scores, so bar height encodes rank and nothing else. */}
        {(matches.data?.matches.length ?? 0) > 0 && (
          <div className="rounded-2xl bg-[#F8F8F4] p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#18181B]">
                Rank order
              </span>
              <span className="text-[10px] text-gray-400">Rank, not a similarity score</span>
            </div>
            <CapsuleBarChart
              ticks={[]}
              bars={(matches.data?.matches ?? []).slice(0, 8).map((m, idx, all) => ({
                label: `#${m.rank}`,
                value: (all.length - idx) / all.length,
                badge: m.recommended ? 'Rec' : null,
              }))}
            />
          </div>
        )}

        <div className="divide-y divide-[#F0F0EA]">
          {(matches.data?.matches ?? []).map((m) => {
            const alreadyInvited = invitedIds.has(m.startup_id);
            return (
              <div key={m.startup_id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-black text-[#A89F94] tabular-nums w-6 shrink-0">
                    #{m.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1A1A1A] truncate">{m.name}</div>
                    <div className="text-[11px] text-[#6B6560]">Startup #{m.startup_id}</div>
                  </div>
                  {m.recommended && <StatusBadge status="success" label="Recommended" />}
                </div>

                {canInvite && (
                  <DocButton
                    size="sm"
                    variant={alreadyInvited ? 'ghost' : 'secondary'}
                    role="officer"
                    disabled={alreadyInvited || invite.pending}
                    onClick={() =>
                      invite.run(() => api.sendInvite(psId, { startup_id: m.startup_id }), {
                        successMessage: `Invite sent to ${m.name}.`,
                        onSuccess: () => invites.refetch(),
                      })
                    }
                  >
                    {alreadyInvited ? 'Invited' : 'Invite'}
                  </DocButton>
                )}
              </div>
            );
          })}
        </div>

        {invite.error && (
          <div className="mt-3">
            <AlertStrip type="error" title="Invite failed" message={invite.error.detail} />
          </div>
        )}
        {invite.success && (
          <div className="mt-3">
            <AlertStrip type="success" message={invite.success} />
          </div>
        )}
      </DataCard>

      <DataCard>
        <PanelHeading
          title="Invites sent"
          endpoint={`GET /problem-statements/${psId}/invites`}
        />

        {invites.loading && <LoadingBlock label="Loading invites…" rows={2} />}
        {invites.error && (
          <ApiErrorState error={invites.error} onRetry={invites.refetch} />
        )}

        {invites.data && invites.data.length === 0 && (
          <EmptyState title="No invites sent" hint="Invite a matched startup from the panel above." />
        )}

        <div className="space-y-2">
          {(invites.data ?? []).map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-[#E5E5E0] px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <IconBadge
                  size="sm"
                  tone={inv.converted ? 'ok' : 'muted'}
                  icon={<Mail className="w-3.5 h-3.5" />}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#18181B]">
                    Startup #{inv.startup_id}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Invited {fmtDateTime(inv.invited_at)}
                  </div>
                </div>
              </div>
              <StatPill tone={inv.converted ? 'ok' : 'ghost'}>
                {inv.converted ? 'Applied' : 'Pending'}
              </StatPill>
            </div>
          ))}
        </div>
      </DataCard>
    </div>
  );
};

// ── Applications ─────────────────────────────────────────────

const ApplicationsTab: React.FC<{ psId: number }> = ({ psId }) => {
  const query = useQuery(() => api.getApplicationsForPS(psId), [psId]);

  return (
    <DataCard>
      <PanelHeading
        title="Applications received"
        endpoint={`GET /applications?problem_statement_id=${psId}`}
      />

      {query.loading && <LoadingBlock label="Loading applications…" />}
      {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && query.data.length === 0 && (
        <EmptyState
          title="No applications yet"
          hint="Startups can apply once this problem statement is published."
        />
      )}

      {(query.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl bg-[#F8F8F4] p-4 mb-4 max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <IconBadge size="sm" icon={<PieChart className="w-3.5 h-3.5" />} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#18181B]">
              By status
            </span>
          </div>
          <ApplicationStatusDonut apps={query.data ?? []} />
        </div>
      )}

      <div className="divide-y divide-[#F0F0EA]">
        {(query.data ?? []).map((app) => (
          <div key={app.id} className="py-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={app.status} />
                <span className="font-mono text-[11px] text-[#A89F94]">APP #{app.id}</span>
              </div>
              <div className="text-xs font-bold text-[#1A1A1A] mt-1 truncate">
                {(app.technical_proposal?.title as string | undefined) ?? `Application #${app.id}`}
              </div>
              <div className="text-[11px] text-[#6B6560]">
                Startup #{app.startup_id} · submitted {fmtDateTime(app.created_at)}
              </div>
            </div>
            <DocLinkButton
              href={`/officer/applications/${app.id}`}
              role="officer"
              size="sm"
              icon={<ArrowRight className="w-3 h-3" />}
            >
              Review
            </DocLinkButton>
          </div>
        ))}
      </div>
    </DataCard>
  );
};

// ── QCBS ranking ─────────────────────────────────────────────

const RankingTab: React.FC<{ psId: number }> = ({ psId }) => {
  const query = useQuery(() => api.getQCBSRanking(psId), [psId]);

  return (
    <DataCard>
      <PanelHeading
        title="QCBS ranking"
        endpoint={`GET /problem-statements/${psId}/qcbs-ranking`}
      />

      {query.loading && <LoadingBlock label="Computing ranking…" />}
      {query.error && (
        <ApiErrorState
          error={query.error}
          onRetry={query.refetch}
          notFoundLabel="Ranking not available yet"
        />
      )}

      {query.data && query.data.rankings.length === 0 && (
        <EmptyState
          title="Nothing to rank yet"
          hint="Ranking needs scored applications with the commercial stage unlocked."
        />
      )}

      {query.data && query.data.rankings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94] text-left">
                <th className="pb-2 pr-3">Rank</th>
                <th className="pb-2 pr-3">Application</th>
                <th className="pb-2 pr-3">Startup</th>
                <th className="pb-2 pr-3 text-right">Technical</th>
                <th className="pb-2 pr-3 text-right">Commercial</th>
                <th className="pb-2 pr-3 text-right">Final</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EDE4]">
              {query.data.rankings.map((row) => (
                <tr key={row.application_id}>
                  <td className="py-2.5 pr-3 font-black text-sm tabular-nums">{row.rank}</td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">#{row.application_id}</td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">#{row.startup_id}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {row.technical_score.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {row.commercial_score.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-bold tabular-nums">
                    {row.final_score.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right">
                    <DocLinkButton
                      href={`/officer/applications/${row.application_id}`}
                      role="officer"
                      size="sm"
                      variant="ghost"
                    >
                      Open
                    </DocLinkButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataCard>
  );
};

export default function OfficerProblemStatementDetailPage() {
  const params = useParams<{ id: string }>();
  const psId = Number(params.id);

  return (
    <AppLayout allow="officer">
      {Number.isFinite(psId) ? (
        <Suspense fallback={<LoadingBlock label="Loading…" />}>
          <PSDetail psId={psId} />
        </Suspense>
      ) : (
        <EmptyState title="Invalid problem statement id" hint={`"${params.id}" is not a number.`} />
      )}
    </AppLayout>
  );
}
