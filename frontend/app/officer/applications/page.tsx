'use client';

/**
 * The officer's whole application queue.
 *
 * There is no "list every application" route — GET /applications requires
 * exactly one filter, and the officer branch is
 * `?problem_statement_id=`. So this page loads the officer's own problem
 * statements first and then fans out one request per statement, merging the
 * results into a single queue.
 */

import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  DocLinkButton,
  DocSelect,
  DocumentForm,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import {
  Card,
  PageHeader,
  PillLink,
  StatPill,
} from '@/components/shared/design-system';
import {
  ApplicationStatusDonut,
  EligibilityDots,
} from '@/components/shared/domain/Insights';
import { orNull } from '@/lib/api/client';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDateTime, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ApplicationRead, ApplicationStatusEnum, ProblemStatementRead } from '@/lib/types/api';
import { ArrowRight, ClipboardList, PieChart, Sliders } from 'lucide-react';

/**
 * The five eligibility sub-checks for one row. Fetched per application because
 * there is no bulk eligibility endpoint; a 404 (not reviewed yet) is normal and
 * renders as "Not reviewed yet" rather than an error.
 */
const RowEligibility: React.FC<{ appId: number }> = ({ appId }) => {
  const check = useQuery(() => orNull(api.getEligibilityCheck(appId)), [appId]);
  if (check.loading) {
    return <span className="text-[10px] text-gray-400">Checking…</span>;
  }
  return <EligibilityDots check={check.data} />;
};

const STATUSES: ApplicationStatusEnum[] = [
  'applied',
  'under_review',
  'under_evaluation',
  'selected',
  'not_selected',
  'contracted',
  'completed',
];

interface QueueRow {
  app: ApplicationRead;
  ps: ProblemStatementRead;
}

export default function OfficerApplicationsPage() {
  const session = useSession();
  const [status, setStatus] = useState<ApplicationStatusEnum | ''>('');
  const [psFilter, setPsFilter] = useState<string>('');

  const queue = useQuery<{ rows: QueueRow[]; problemStatements: ProblemStatementRead[] }>(
    async () => {
      const all = await api.getProblemStatements();
      const mine = all.filter((ps) => ps.officer_id === session!.userId);

      // One request per owned problem statement; a failure on one must not take
      // out the whole queue, so failures are dropped rather than thrown.
      const results = await Promise.all(
        mine.map(async (ps) => {
          try {
            const apps = await api.getApplicationsForPS(ps.id);
            return apps.map((app) => ({ app, ps }));
          } catch {
            return [] as QueueRow[];
          }
        }),
      );

      return {
        problemStatements: mine,
        rows: results.flat().sort((a, b) => b.app.id - a.app.id),
      };
    },
    [session?.userId],
    { enabled: Boolean(session) },
  );

  const visible = useMemo(() => {
    const rows = queue.data?.rows ?? [];
    return rows
      .filter((r) => (status ? r.app.status === status : true))
      .filter((r) => (psFilter ? String(r.ps.id) === psFilter : true));
  }, [queue.data, status, psFilter]);

  return (
    <AppLayout allow="officer">
      <div className="space-y-6">
        <PageHeader
          line1="Applications"
          glyph={<Sliders className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Queue"
          subtitle="Every application submitted against a problem statement you own."
          action={
            <PillLink
              href="/officer/problem-statements"
              variant="outline"
              icon={<ClipboardList className="w-4 h-4" />}
            >
              My statements
            </PillLink>
          }
        />

        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Problem statement
            </label>
            <DocSelect value={psFilter} onChange={(e) => setPsFilter(e.target.value)}>
              <option value="">All of mine</option>
              {(queue.data?.problemStatements ?? []).map((ps) => (
                <option key={ps.id} value={ps.id}>
                  PS #{ps.id} — {ps.title}
                </option>
              ))}
            </DocSelect>
          </div>

          <div className="w-48">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Status
            </label>
            <DocSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatusEnum | '')}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </DocSelect>
          </div>
        </div>

        {visible.length > 0 && (
          <Card
            icon={<PieChart className="w-4 h-4" />}
            label="Queue Breakdown"
            aside={
              <StatPill>
                {visible.length} of {queue.data?.rows.length ?? 0}
              </StatPill>
            }
            className="max-w-sm"
          >
            <ApplicationStatusDonut
              apps={visible.map((r) => r.app)}
              emptyLabel="Nothing matches these filters."
            />
          </Card>
        )}

        {(queue.loading || !session) && <LoadingBlock label="Building the queue…" />}
        {queue.error && <ApiErrorState error={queue.error} onRetry={queue.refetch} />}

        {queue.data && visible.length === 0 && (
          <EmptyState
            title={
              queue.data.problemStatements.length === 0
                ? 'You do not own any problem statements yet'
                : 'No applications match these filters'
            }
            hint={
              queue.data.problemStatements.length === 0
                ? 'Create and publish a problem statement first — applications appear here as startups submit them.'
                : 'Try clearing the status or problem statement filter.'
            }
            action={
              queue.data.problemStatements.length === 0 ? (
                <DocLinkButton href="/officer/problem-statements/new" role="officer" size="sm">
                  Create a problem statement
                </DocLinkButton>
              ) : undefined
            }
          />
        )}

        {visible.length > 0 && (
          <DocumentForm
            title="Application Queue"
            subtitle={`${visible.length} of ${queue.data?.rows.length ?? 0} applications`}
            refNumber="APP-QUEUE"
            role="officer"
          >
            <div className="pt-2 divide-y divide-[#F0F0EA]">
              {visible.map(({ app, ps }) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={app.status} />
                      <span className="font-mono text-[11px] text-[#9CA3AF]">
                        APP #{app.id} · PS #{ps.id}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#18181B] truncate">
                      {(app.technical_proposal?.title as string | undefined) ??
                        `Application #${app.id}`}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      {ps.title} · startup #{app.startup_id} · {fmtDateTime(app.created_at)}
                    </div>
                    <RowEligibility appId={app.id} />
                  </div>

                  <DocLinkButton
                    href={`/officer/applications/${app.id}`}
                    role="officer"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Review
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
