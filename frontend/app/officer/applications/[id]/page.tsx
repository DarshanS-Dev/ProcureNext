'use client';

/**
 * One application, from the owning officer's side — the full review path:
 * proposal and startup profile, eligibility review, checklist verification,
 * scores and QCBS, risk and containment, the readiness gate and selection, then
 * the contract, milestones and pilot outcome.
 */

import React, { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { AlertStrip, PageHeader, StatusBadge } from '@/components/shared/DesignSystem';
import { PipelineStepper } from '@/components/shared/PipelineStepper';
import { TabStrip, useTabParam } from '@/components/shared/Tabs';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import {
  ChecklistPanel,
  ContainmentPlanPanel,
  ContractPanel,
  DecisionReadinessPanel,
  EligibilityPanel,
  KPIVerdictsPanel,
  MilestonesPanel,
  PilotOutcomePanel,
  ProposalPanel,
  QCBSPanel,
  RiskProfilePanel,
  SandboxTrialPanel,
  ScoresPanel,
  StartupProfilePanel,
} from '@/components/panels/ApplicationPanels';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'scoring', label: 'Scoring & QCBS' },
  { id: 'risk', label: 'Risk & containment' },
  { id: 'decision', label: 'Decision' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'contract', label: 'Contract & pilot' },
];

function OfficerApplicationDetail({ appId }: { appId: number }) {
  const session = useSession();
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

  const isOwner = Boolean(session && psQuery.data && psQuery.data.officer_id === session.userId);
  const commercialUnlocked = Boolean(psQuery.data?.commercial_unlocked_at);

  if (appQuery.loading) return <LoadingBlock label="Loading application…" />;
  if (appQuery.error) return <ApiErrorState error={appQuery.error} onRetry={appQuery.refetch} />;
  if (!app) return null;

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
        role="officer"
        breadcrumb={[
          { label: 'Officer', href: '/officer/dashboard' },
          { label: 'Applications', href: '/officer/applications' },
          { label: `#${app.id}` },
        ]}
        actions={<StatusBadge status={app.status} />}
      />

      <div className="text-[11px] text-[#A89F94]">
        Startup #{app.startup_id} · submitted {fmtDateTime(app.created_at)}
        {psQuery.data ? ` · ${humanize(psQuery.data.category)}` : ''}
      </div>

      {psQuery.data && !isOwner && (
        <AlertStrip
          type="warning"
          title="Not the owning officer"
          message={`This problem statement belongs to officer #${psQuery.data.officer_id}. You can read this application, but the server will refuse every write below.`}
        />
      )}

      <PipelineStepper currentStatus={app.status} />

      <TabStrip tabs={TABS} active={active} onChange={setActive} role="officer" />

      <div className="space-y-5">
        {active === 'overview' && (
          <>
            <ProposalPanel
              technical={app.technical_proposal}
              commercial={app.commercial_proposal}
              showCommercial={commercialUnlocked}
            />
            <StartupProfilePanel startupId={app.startup_id} />
          </>
        )}

        {active === 'eligibility' && <EligibilityPanel appId={appId} canReview={isOwner} />}

        {active === 'checklist' && <ChecklistPanel appId={appId} canReview={isOwner} />}

        {active === 'scoring' && (
          <>
            <ScoresPanel appId={appId} showCompleteness />
            <QCBSPanel appId={appId} />
          </>
        )}

        {active === 'risk' && (
          <>
            <RiskProfilePanel appId={appId} />
            <ContainmentPlanPanel appId={appId} canEdit={isOwner} />
          </>
        )}

        {active === 'decision' && (
          <DecisionReadinessPanel
            appId={appId}
            canSelect={isOwner}
            canViewCOI={true}
            onSelected={() => appQuery.refetch()}
          />
        )}

        {active === 'sandbox' && <SandboxTrialPanel appId={appId} />}

        {active === 'contract' && (
          <>
            <ContractPanel appId={appId} canCreate={isOwner} onContract={setContractId} />

            {resolvedContractId ? (
              <>
                <MilestonesPanel contractId={resolvedContractId} canPlan={isOwner} />
                <KPIVerdictsPanel
                  contractId={resolvedContractId}
                  problemStatementId={app.problem_statement_id}
                />
                <PilotOutcomePanel contractId={resolvedContractId} canDecide={isOwner} />
              </>
            ) : (
              <EmptyState
                title="No contract yet"
                hint="Milestones, KPI verdicts and the pilot outcome all hang off a contract. Raise one above once this application is selected."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function OfficerApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const appId = Number(params.id);

  return (
    <AppLayout allow="officer">
      {Number.isFinite(appId) ? (
        <Suspense fallback={<LoadingBlock label="Loading application…" />}>
          <OfficerApplicationDetail appId={appId} />
        </Suspense>
      ) : (
        <EmptyState title="Invalid application id" hint={`"${params.id}" is not a number.`} />
      )}
    </AppLayout>
  );
}
