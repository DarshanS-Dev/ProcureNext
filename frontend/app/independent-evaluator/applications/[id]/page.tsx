'use client';

/**
 * The independent evaluator's verification workspace for one application:
 * record the sandbox trial, review milestone evidence, and record a met /
 * not-met verdict per KPI.
 *
 * Milestones and KPI verdicts live under the contract, which is resolved from
 * the application via GET /applications/{id}/contract.
 */

import React, { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { PageHeader, StatusBadge } from '@/components/shared/DesignSystem';
import { TabStrip, useTabParam } from '@/components/shared/Tabs';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import {
  ContractPanel,
  KPIVerdictsPanel,
  MilestonesPanel,
  PilotOutcomePanel,
  ProposalPanel,
  SandboxTrialPanel,
  StartupProfilePanel,
} from '@/components/panels/ApplicationPanels';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';

const TABS = [
  { id: 'sandbox', label: 'Sandbox trial' },
  { id: 'milestones', label: 'Milestone review' },
  { id: 'kpis', label: 'KPI verdicts' },
  { id: 'context', label: 'Context' },
];

function VerificationWorkspace({ appId }: { appId: number }) {
  const { active, setActive } = useTabParam(TABS);

  const appQuery = useQuery(() => api.getApplication(appId), [appId]);
  const app = appQuery.data;

  const psQuery = useQuery(
    () => api.getProblemStatement(app!.problem_statement_id),
    [app?.problem_statement_id],
    { enabled: Boolean(app) },
  );

  const contractQuery = useQuery(() => orNull(api.getContract(appId)), [appId]);
  const [contractId, setContractId] = useState<number | null>(null);
  const resolvedContractId = contractQuery.data?.id ?? contractId;

  if (appQuery.loading) return <LoadingBlock label="Loading application…" />;
  if (appQuery.error) return <ApiErrorState error={appQuery.error} onRetry={appQuery.refetch} />;
  if (!app) return null;

  const noContract = (
    <EmptyState
      title="No contract on this application"
      hint="Milestones and KPI verdicts only exist once the officer has raised a contract for the pilot."
    />
  );

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
        role="independent-evaluator"
        breadcrumb={[
          { label: 'Independent evaluator', href: '/independent-evaluator/dashboard' },
          { label: 'Applications', href: '/independent-evaluator/applications' },
          { label: `#${app.id}` },
        ]}
        actions={<StatusBadge status={app.status} />}
      />

      <div className="text-[11px] text-[#A89F94]">
        Startup #{app.startup_id} · submitted {fmtDateTime(app.created_at)}
        {psQuery.data ? ` · ${humanize(psQuery.data.category)}` : ''}
        {resolvedContractId ? ` · contract #${resolvedContractId}` : ''}
      </div>

      <TabStrip tabs={TABS} active={active} onChange={setActive} role="independent-evaluator" />

      <div className="space-y-5">
        {active === 'sandbox' && <SandboxTrialPanel appId={appId} canRecord />}

        {active === 'milestones' &&
          (resolvedContractId ? (
            <MilestonesPanel contractId={resolvedContractId} canReview />
          ) : (
            noContract
          ))}

        {active === 'kpis' &&
          (resolvedContractId ? (
            <KPIVerdictsPanel
              contractId={resolvedContractId}
              problemStatementId={app.problem_statement_id}
              canRecord
            />
          ) : (
            noContract
          ))}

        {active === 'context' && (
          <>
            <ContractPanel appId={appId} onContract={setContractId} />
            <ProposalPanel
              technical={app.technical_proposal}
              commercial={app.commercial_proposal}
              // Verification is about delivered outcomes, not the bid.
              showCommercial={false}
            />
            <StartupProfilePanel startupId={app.startup_id} />
            {resolvedContractId && <PilotOutcomePanel contractId={resolvedContractId} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function IndependentEvaluatorApplicationPage() {
  const params = useParams<{ id: string }>();
  const appId = Number(params.id);

  return (
    <AppLayout allow="independent_evaluator">
      {Number.isFinite(appId) ? (
        <Suspense fallback={<LoadingBlock label="Loading application…" />}>
          <VerificationWorkspace appId={appId} />
        </Suspense>
      ) : (
        <EmptyState title="Invalid application id" hint={`"${params.id}" is not a number.`} />
      )}
    </AppLayout>
  );
}
