'use client';

/**
 * The evaluator's view of one application: declare COI, then score it.
 *
 * Ordering matters and is enforced server-side — scoring_service refuses a
 * submission from an evaluator who has not declared, and evaluator_service
 * auto-recuses anyone who declares a conflict. So the scoring form stays locked
 * until a clean declaration exists, and explains why.
 *
 * Both writes are one-shot: the COI declaration has a unique constraint and no
 * resubmission path, and scores 409 on a second submission.
 */

import React, { Suspense, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocInput,
  DocTextarea,
  PageHeader,
  SectionDivider,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { PanelHeading, ProposalPanel, ScoresPanel, StartupProfilePanel } from '@/components/panels/ApplicationPanels';
import { TabStrip, useTabParam } from '@/components/shared/Tabs';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import { api, orNull } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { EvaluationScoreEntry } from '@/lib/types/api';
import { ShieldAlert } from 'lucide-react';

const TABS = [
  { id: 'proposal', label: 'Proposal' },
  { id: 'coi', label: 'Conflict of interest' },
  { id: 'score', label: 'Scoring' },
];

function EvaluatorApplicationDetail({ appId }: { appId: number }) {
  const { active, setActive } = useTabParam(TABS);

  const appQuery = useQuery(() => api.getApplication(appId), [appId]);
  const app = appQuery.data;

  const psQuery = useQuery(
    () => api.getProblemStatement(app!.problem_statement_id),
    [app?.problem_statement_id],
    { enabled: Boolean(app) },
  );

  // No declaration yet is the normal starting state, so 404 becomes null.
  const coiQuery = useQuery(() => orNull(api.getCOIDeclaration(appId)), [appId]);

  if (appQuery.loading) return <LoadingBlock label="Loading application…" />;
  if (appQuery.error) return <ApiErrorState error={appQuery.error} onRetry={appQuery.refetch} />;
  if (!app) return null;

  const coi = coiQuery.data;
  const declared = Boolean(coi);
  const recused = Boolean(coi?.recused);
  const commercialUnlocked = Boolean(psQuery.data?.commercial_unlocked_at);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          (app.technical_proposal?.title as string | undefined) ?? `Application #${app.id}`
        }
        subtitle={
          psQuery.data
            ? `PS #${app.problem_statement_id} — ${psQuery.data.title}`
            : `Problem statement #${app.problem_statement_id}`
        }
        phase={`Application #${app.id}`}
        role="evaluator"
        breadcrumb={[
          { label: 'Evaluator', href: '/evaluator/dashboard' },
          { label: 'Assigned', href: '/evaluator/assigned' },
          { label: `#${app.id}` },
        ]}
        actions={<StatusBadge status={app.status} />}
      />

      {recused && (
        <AlertStrip
          type="warning"
          title="You are recused from this application"
          message="You declared a conflict of interest, so you cannot score it. An admin can assign a replacement evaluator."
        />
      )}

      <TabStrip tabs={TABS} active={active} onChange={setActive} role="evaluator" />

      <div className="space-y-5">
        {active === 'proposal' && (
          <>
            <ProposalPanel
              technical={app.technical_proposal}
              commercial={app.commercial_proposal}
              // Evaluators score technical merit; the bid stays sealed until the
              // officer unlocks the commercial stage.
              showCommercial={commercialUnlocked}
            />
            <StartupProfilePanel startupId={app.startup_id} />
          </>
        )}

        {active === 'coi' && (
          <COIPanel
            appId={appId}
            declaration={coi}
            loading={coiQuery.loading}
            onDeclared={() => coiQuery.refetch()}
          />
        )}

        {active === 'score' && (
          <>
            <ScoringForm appId={appId} declared={declared} recused={recused} />
            <ScoresPanel appId={appId} />
          </>
        )}
      </div>
    </div>
  );
}

// ── COI ──────────────────────────────────────────────────────

const COIPanel: React.FC<{
  appId: number;
  declaration: Awaited<ReturnType<typeof api.getCOIDeclaration>> | null | undefined;
  loading: boolean;
  onDeclared: () => void;
}> = ({ appId, declaration, loading, onDeclared }) => {
  const declare = useMutation();

  return (
    <DataCard>
      <PanelHeading
        title="Conflict of interest declaration"
        endpoint={`POST /applications/${appId}/coi-declaration`}
        right={
          declaration ? (
            <StatusBadge
              status={declaration.recused ? 'error' : 'success'}
              label={declaration.recused ? 'Recused' : 'Cleared'}
            />
          ) : undefined
        }
      />

      {loading && <LoadingBlock label="Checking declaration…" rows={1} />}

      {declaration && (
        <div className="space-y-2">
          <AlertStrip
            type={declaration.recused ? 'warning' : 'success'}
            title={declaration.recused ? 'Conflict declared' : 'No conflict declared'}
            message={
              declaration.recused
                ? 'You are recused from this application and cannot score it.'
                : 'You are cleared to score this application.'
            }
          />
          <p className="text-[11px] text-[#A89F94]">
            Declared {fmtDateTime(declaration.declared_at)}. Declarations are final —
            there is no resubmission path.
          </p>
        </div>
      )}

      {!declaration && !loading && (
        <div className="space-y-4">
          <p className="text-xs text-[#6B6560] leading-relaxed">
            Mandatory before scoring. Declare a conflict if you have any financial,
            employment, advisory or personal relationship with this startup.{' '}
            <span className="font-bold">
              This cannot be undone — declaring a conflict recuses you from this
              application permanently.
            </span>
          </p>

          {declare.error && (
            <AlertStrip
              type="error"
              title={declare.error.status === 409 ? 'Already declared' : 'Declaration failed'}
              message={declare.error.detail}
            />
          )}

          <div className="flex flex-wrap gap-3">
            <DocButton
              variant="primary"
              role="evaluator"
              size="sm"
              loading={declare.pending}
              onClick={() =>
                declare.run(() => api.declareCOI(appId, { declared_conflict: false }), {
                  successMessage: 'Declared — you are cleared to score.',
                  onSuccess: onDeclared,
                })
              }
            >
              I have no conflict
            </DocButton>

            <DocButton
              variant="danger"
              size="sm"
              loading={declare.pending}
              icon={<ShieldAlert className="w-3 h-3" />}
              onClick={() => {
                if (
                  window.confirm(
                    'Declaring a conflict permanently recuses you from this application. Continue?',
                  )
                ) {
                  declare.run(() => api.declareCOI(appId, { declared_conflict: true }), {
                    successMessage: 'Conflict declared — you are recused.',
                    onSuccess: onDeclared,
                  });
                }
              }}
            >
              I have a conflict
            </DocButton>
          </div>
        </div>
      )}
    </DataCard>
  );
};

// ── Scoring ──────────────────────────────────────────────────

const ScoringForm: React.FC<{ appId: number; declared: boolean; recused: boolean }> = ({
  appId,
  declared,
  recused,
}) => {
  const criteria = useQuery(() => api.getRubricCriteria(), []);
  const submit = useMutation();
  const [entries, setEntries] = useState<Record<number, { score: string; justification: string }>>(
    {},
  );

  const rows = criteria.data ?? [];

  const totalWeight = useMemo(
    () => rows.reduce((sum, c) => sum + c.weight, 0),
    [rows],
  );

  const weightedTotal = useMemo(
    () =>
      rows.reduce((sum, c) => {
        const raw = Number(entries[c.id]?.score ?? '');
        return sum + (Number.isFinite(raw) ? raw * c.weight : 0);
      }, 0),
    [rows, entries],
  );

  const complete =
    rows.length > 0 &&
    rows.every((c) => {
      const e = entries[c.id];
      return e && e.score !== '' && e.justification.trim().length > 0;
    });

  const locked = !declared || recused;

  return (
    <DataCard>
      <PanelHeading
        title="Rubric scoring"
        endpoint={`POST /applications/${appId}/scores`}
        right={
          rows.length > 0 ? (
            <StatusBadge status="info" label={`Weighted total ${weightedTotal.toFixed(2)}`} />
          ) : undefined
        }
      />

      {locked && (
        <AlertStrip
          type="warning"
          title={recused ? 'Recused' : 'Declare your conflict of interest first'}
          message={
            recused
              ? 'You declared a conflict on this application, so scoring is closed to you.'
              : 'The server refuses scores from an evaluator who has not filed a COI declaration. Use the Conflict of interest tab first.'
          }
        />
      )}

      {criteria.loading && <LoadingBlock label="Loading rubric…" />}
      {criteria.error && <ApiErrorState error={criteria.error} onRetry={criteria.refetch} />}

      {criteria.data && rows.length === 0 && (
        <EmptyState
          title="No rubric criteria seeded"
          hint="The platform-wide rubric rows have not been created. Run the seed script in backend/scripts before scoring."
        />
      )}

      {rows.length > 0 && (
        <form
          className="space-y-5 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const payload: EvaluationScoreEntry[] = rows.map((c) => ({
              criterion_id: c.id,
              score: Number(entries[c.id].score),
              justification: entries[c.id].justification.trim(),
            }));
            submit.run(() => api.submitScores(appId, { scores: payload }), {
              successMessage: 'Scores submitted.',
            });
          }}
        >
          <p className="text-xs text-[#6B6560]">
            All {rows.length} criteria are submitted together in a single call, and
            cannot be revised afterwards. Total rubric weight is {totalWeight.toFixed(2)}.
          </p>

          <div className="space-y-4">
            {rows.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-lg space-y-2.5"
                style={{ backgroundColor: '#FDFBF7', border: '1px solid #E8E2D5' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-[#1A1A1A]">{c.name}</div>
                    <div className="text-[10px] text-[#A89F94]">
                      Weight {c.weight}
                      {c.category ? ` · ${humanize(c.category)}` : ' · all categories'}
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <DocInput
                      lineStyle={false}
                      type="number"
                      step="0.1"
                      min={0}
                      max={10}
                      required
                      disabled={locked}
                      aria-label={`Score for ${c.name}`}
                      placeholder="0–10"
                      value={entries[c.id]?.score ?? ''}
                      onChange={(ev) =>
                        setEntries((s) => ({
                          ...s,
                          [c.id]: {
                            justification: s[c.id]?.justification ?? '',
                            score: ev.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <DocTextarea
                  rows={2}
                  required
                  disabled={locked}
                  aria-label={`Justification for ${c.name}`}
                  placeholder="Why this score — the reasoning is part of the record."
                  value={entries[c.id]?.justification ?? ''}
                  onChange={(ev) =>
                    setEntries((s) => ({
                      ...s,
                      [c.id]: {
                        score: s[c.id]?.score ?? '',
                        justification: ev.target.value,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <SectionDivider label="Submit" />

          {submit.error && (
            <AlertStrip
              type="error"
              title={
                submit.error.status === 409
                  ? 'Already scored'
                  : submit.error.isForbidden
                    ? 'Not permitted'
                    : 'Submission failed'
              }
              message={submit.error.detail}
            />
          )}
          {submit.success && <AlertStrip type="success" message={submit.success} />}

          <DocButton
            type="submit"
            variant="primary"
            role="evaluator"
            loading={submit.pending}
            disabled={locked || !complete}
          >
            Submit all {rows.length} scores
          </DocButton>

          {!complete && !locked && (
            <p className="text-[11px] text-[#A89F94]">
              Every criterion needs a score and a justification before this can be
              submitted.
            </p>
          )}
        </form>
      )}
    </DataCard>
  );
};

export default function EvaluatorApplicationPage() {
  const params = useParams<{ id: string }>();
  const appId = Number(params.id);

  return (
    <AppLayout allow="evaluator">
      {Number.isFinite(appId) ? (
        <Suspense fallback={<LoadingBlock label="Loading application…" />}>
          <EvaluatorApplicationDetail appId={appId} />
        </Suspense>
      ) : (
        <EmptyState title="Invalid application id" hint={`"${params.id}" is not a number.`} />
      )}
    </AppLayout>
  );
}
