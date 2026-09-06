'use client';

/**
 * One application, from the startup's side.
 *
 * Everything the startup is allowed to see or do against this application lives
 * here: the proposal itself, the eligibility snapshot, the document checklist
 * (the one thing they write to at this stage), the sandbox trial, and — once a
 * contract exists — milestones with evidence submission, KPI verdicts and the
 * final outcome.
 */

import React, { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { PageHeader, StatusBadge } from '@/components/shared/DesignSystem';
import { PipelineStepper } from '@/components/shared/PipelineStepper';
import { TabStrip, useTabParam } from '@/components/shared/Tabs';
import { ApiErrorState, LoadingBlock, fmtDateTime, humanize } from '@/components/shared/States';
import {
  ChecklistPanel,
  ContractPanel,
  EligibilityPanel,
  KPIVerdictsPanel,
  MilestonesPanel,
  PilotOutcomePanel,
  ProposalPanel,
  SandboxTrialPanel,
} from '@/components/panels/ApplicationPanels';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { EmptyState } from '@/components/shared/States';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'contract', label: 'Contract' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'kpis', label: 'KPI verdicts' },
  { id: 'outcome', label: 'Outcome' },
];

function ApplicationDetail({ appId }: { appId: number }) {
  const { active, setActive } = useTabParam(TABS);

  const appQuery = useQuery(() => api.getApplication(appId), [appId]);
  const app = appQuery.data;

  const psQuery = useQuery(() => api.getProblemStatement(app!.problem_statement_id), [
    app?.problem_statement_id,
  ], { enabled: Boolean(app) });

  // A contract may legitimately not exist yet, so a 404 here is not an error.
  const contractQuery = useQuery(() => orNull(api.getContract(appId)), [appId]);
  const [contractId, setContractId] = useState<number | null>(null);
  const resolvedContractId = contractQuery.data?.id ?? contractId;

  const commercialUnlocked = Boolean(psQuery.data?.commercial_unlocked_at);

  if (appQuery.loading) return <LoadingBlock label="Loading application…" />;
  if (appQuery.error) return <ApiErrorState error={appQuery.error} onRetry={appQuery.refetch} />;
  if (!app) return null;

  const title =
    (app.technical_proposal?.title as string | undefined) ||
    psQuery.data?.title ||
    `Application #${app.id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={
          psQuery.data
            ? `Against PS #${app.problem_statement_id} — ${psQuery.data.title}`
            : `Against problem statement #${app.problem_statement_id}`
        }
        phase={`Application #${app.id}`}
        role="startup"
        breadcrumb={[
          { label: 'Startup', href: '/startup/dashboard' },
          { label: 'Applications', href: '/startup/applications' },
          { label: `#${app.id}` },
        ]}
        actions={<StatusBadge status={app.status} />}
      />

      <div className="text-[11px] text-[#A89F94]">
        Submitted {fmtDateTime(app.created_at)}
        {psQuery.data ? ` · ${humanize(psQuery.data.category)}` : ''}
      </div>

      <PipelineStepper currentStatus={app.status} />

      <TabStrip tabs={TABS} active={active} onChange={setActive} role="startup" />

      <div className="space-y-5">
        {active === 'overview' && (
          <>
            <ProposalPanel
              technical={app.technical_proposal}
              commercial={app.commercial_proposal}
              // The startup wrote this, so it always sees its own bid.
              showCommercial
            />
            <EligibilityPanel appId={appId} />
          </>
        )}

        {active === 'checklist' && <ChecklistPanel appId={appId} canUpload />}

        {active === 'sandbox' && <SandboxTrialPanel appId={appId} />}

        {active === 'contract' && (
          <ContractPanel appId={appId} onContract={setContractId} />
        )}

        {active === 'milestones' &&
          (resolvedContractId ? (
            <MilestonesPanel contractId={resolvedContractId} canSubmitEvidence />
          ) : (
            <EmptyState
              title="No contract yet"
              hint="Milestones are created with the contract, once this application is selected for a pilot."
            />
          ))}

        {active === 'kpis' &&
          (resolvedContractId ? (
            <KPIVerdictsPanel
              contractId={resolvedContractId}
              problemStatementId={app.problem_statement_id}
            />
          ) : (
            <EmptyState title="No contract yet" hint="KPI verdicts are recorded against a contract." />
          ))}

        {active === 'outcome' &&
          (resolvedContractId ? (
            <PilotOutcomePanel contractId={resolvedContractId} />
          ) : (
            <EmptyState title="No contract yet" hint="The pilot outcome is recorded against a contract." />
          ))}
      </div>

      {!commercialUnlocked && psQuery.data && (
        <p className="text-[10px] text-[#A89F94] italic">
          The commercial stage for this problem statement has not been unlocked yet.
        </p>
      )}
    </div>
  );
}

export default function StartupApplicationDetailPage() {
  // useParams is the client-side reader; the `params` prop is a promise in this
  // version of Next and this page is a client component.
  const params = useParams<{ id: string }>();
  const appId = Number(params.id);

  return (
    <AppLayout allow="startup">
      {Number.isFinite(appId) ? (
        <Suspense fallback={<LoadingBlock label="Loading application…" />}>
          <ApplicationDetail appId={appId} />
        </Suspense>
      ) : (
        <EmptyState title="Invalid application id" hint={`"${params.id}" is not a number.`} />
      )}
    </AppLayout>
  );
}
