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
import { ArrowRight } from 'lucide-react';

interface ContractRow {
  contract: ContractRead;
  app: ApplicationRead;
  ps: ProblemStatementRead;
}

/** Statuses at which a contract can plausibly exist. */
const CONTRACTABLE = new Set(['selected', 'contracted', 'completed']);

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

        {rows.length > 0 && (
          <DocumentForm
            title="Contract Register"
            subtitle="GET /applications/{id}/contract"
            refNumber="CON-REG"
            role="officer"
          >
            <div className="pt-2 divide-y divide-[#F0F0EA]">
              {rows.map(({ contract, app, ps }) => (
                <div
                  key={contract.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={app.status} />
                      <span className="font-mono text-[11px] text-[#9CA3AF]">
                        CONTRACT #{contract.id} · APP #{app.id}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#18181B] truncate">{ps.title}</div>
                    <div className="text-[11px] text-[#6B7280]">
                      Startup #{app.startup_id} · raised {fmtDateTime(contract.created_at)} ·{' '}
                      {contract.signed_at ? `signed ${fmtDateTime(contract.signed_at)}` : 'not signed'}
                    </div>
                  </div>

                  <DocLinkButton
                    href={`/officer/applications/${app.id}?tab=contract`}
                    role="officer"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Manage pilot
                  </DocLinkButton>
                </div>
              ))}
            </div>
          </DocumentForm>
        )}
      </div>
    </AppLayout>
  );
}
