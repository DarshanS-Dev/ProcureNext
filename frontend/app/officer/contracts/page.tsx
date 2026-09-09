'use client';

/**
 * Contracts the officer owns.
 *
 * There is no GET /contracts route — a contract is only reachable as
 * /applications/{id}/contract. So this page walks the officer's problem
 * statements to their applications and probes each selected-or-later one for a
 * contract, then links back into the application's Contract & pilot tab, which
 * is where milestones, KPI verdicts and the outcome already live.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  DocLinkButton,
  DocumentForm,
  PageHeader,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  fmtDateTime,
} from '@/components/shared/States';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ApplicationRead, ContractRead, ProblemStatementRead } from '@/lib/types/api';
import { ArrowRight, ScrollText } from 'lucide-react';
import { Card, CardLink, StatPill } from '@/components/shared/design-system';
import { MilestoneStepper } from '@/components/shared/domain/Insights';

interface ContractRow {
  contract: ContractRead;
  app: ApplicationRead;
  ps: ProblemStatementRead;
}

/** Statuses at which a contract can plausibly exist. */
const CONTRACTABLE = new Set(['selected', 'contracted', 'completed']);

/**
 * One pilot at a glance: who, when, and how far through the five milestones.
 * Milestones are fetched per contract because there is no bulk route.
 */
const ContractCard: React.FC<{
  contract: ContractRead;
  app: ApplicationRead;
  ps: ProblemStatementRead;
}> = ({ contract, app, ps }) => {
  const milestones = useQuery(() => orNull(api.getMilestones(contract.id)), [contract.id]);
  const rows = milestones.data ?? [];
  const accepted = rows.filter((m) => m.status === 'accepted').length;
  const paid = rows.filter((m) => m.payment_status === 'paid').length;

  return (
    <Card
      icon={<ScrollText className="w-4 h-4" />}
      label={`Contract #${contract.id}`}
      aside={<StatusBadge status={app.status} />}
      footer={
        <>
          <span>
            {paid} of {rows.length || 5} milestones paid
          </span>
          <CardLink href={`/officer/applications/${app.id}?tab=contract`}>Manage pilot</CardLink>
        </>
      }
    >
      <div className="space-y-1 mb-4">
        <div className="font-bold text-sm text-[#18181B] truncate">{ps.title}</div>
        <div className="text-[11px] text-gray-500">
          Startup #{app.startup_id} · raised {fmtDateTime(contract.created_at)} ·{' '}
          {contract.signed_at ? `signed ${fmtDateTime(contract.signed_at)}` : 'not signed'}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StatPill tone={accepted === 5 ? 'ok' : 'ghost'}>{accepted} / 5 accepted</StatPill>
        {rows.some((m) => m.status === 'rejected') && (
          <StatPill tone="danger">Rework needed</StatPill>
        )}
        {rows.some((m) => m.payment_status === 'due') && <StatPill tone="warn">Payment due</StatPill>}
      </div>

      {milestones.loading ? (
        <div className="h-16 rounded-2xl bg-[#F0F0EA] animate-pulse" />
      ) : (
        <div className="rounded-2xl bg-[#F8F8F4] p-3">
          <MilestoneStepper milestones={rows} />
        </div>
      )}
    </Card>
  );
};

export default function OfficerContractsPage() {
  const session = useSession();

  const query = useQuery<{ rows: ContractRow[]; candidates: number }>(
    async () => {
      const all = await api.getProblemStatements();
      const mine = all.filter((ps) => ps.officer_id === session!.userId);

      const appLists = await Promise.all(
        mine.map(async (ps) => {
          try {
            const apps = await api.getApplicationsForPS(ps.id);
            return apps.map((app) => ({ app, ps }));
          } catch {
            return [] as { app: ApplicationRead; ps: ProblemStatementRead }[];
          }
        }),
      );

      const candidates = appLists.flat().filter(({ app }) => CONTRACTABLE.has(app.status));

      const rows = (
        await Promise.all(
          candidates.map(async ({ app, ps }) => {
            const contract = await orNull(api.getContract(app.id)).catch(() => null);
            return contract ? { contract, app, ps } : null;
          }),
        )
      ).filter((r): r is ContractRow => r !== null);

      return { rows, candidates: candidates.length };
    },
    [session?.userId],
    { enabled: Boolean(session) },
  );

  const rows = query.data?.rows ?? [];

  return (
    <AppLayout allow="officer">
      <div className="space-y-6">
        <PageHeader
          title="Contracts"
          subtitle="Pilots you have contracted, and the applications that are ready for one."
          phase="Layer 5 · Execution"
          role="officer"
          breadcrumb={[{ label: 'Officer', href: '/officer/dashboard' }, { label: 'Contracts' }]}
        />

        {(query.loading || !session) && <LoadingBlock label="Finding contracts…" />}
        {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

        {query.data && rows.length === 0 && (
          <EmptyState
            title="No contracts yet"
            hint={
              query.data.candidates === 0
                ? 'A contract is raised after an application passes the decision-readiness gate and is selected for a pilot.'
                : `${query.data.candidates} application(s) are selected but have no contract raised yet. Open one and raise its contract from the Contract & pilot tab.`
            }
            action={
              <DocLinkButton href="/officer/applications" role="officer" size="sm">
                Go to the applications queue
              </DocLinkButton>
            }
          />
        )}

        {/* A card wall of live pilots. This is where the PRD's Pilot Manager
            "corkboard" lands — folded into the officer's existing contracts
            page rather than given a role and route that do not exist. */}
        {rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {rows.map(({ contract, app, ps }) => (
              <ContractCard key={contract.id} contract={contract} app={app} ps={ps} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
