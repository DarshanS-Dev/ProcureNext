'use client';

/**
 * GET /applications?startup_id={me} — the route requires exactly one filter,
 * and a startup may only pass its own id, which comes from the JWT.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  DocLinkButton,
  DocumentForm,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDateTime, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ArrowRight, ClipboardList, PieChart} from 'lucide-react';
import { Card, PageHeader, StatPill } from '@/components/shared/design-system';
import {
  ApplicationStatusDonut,
  ApplicationStatusStepper,
} from '@/components/shared/domain/Insights';

export default function StartupApplicationsPage() {
  const session = useSession();

  const appsQuery = useQuery(
    () => api.getApplicationsForStartup(session!.userId),
    [session?.userId],
    { enabled: Boolean(session) },
  );
  const psQuery = useQuery(() => api.getProblemStatements(), []);

  const psById = new Map((psQuery.data ?? []).map((ps) => [ps.id, ps]));

  return (
    <AppLayout allow="startup">
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          line1="My"
          glyph={<ClipboardList className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Applications"
          subtitle="Every proposal you have submitted, and where each one sits in the pipeline."
        />

        {(appsQuery.loading || !session) && <LoadingBlock label="Loading applications…" />}
        {appsQuery.error && <ApiErrorState error={appsQuery.error} onRetry={appsQuery.refetch} />}

        {appsQuery.data && appsQuery.data.length === 0 && (
          <EmptyState
            title="No applications yet"
            hint="Applying needs a complete Level 2 profile and admin-verified compliance. Check your profile first, then browse open problem statements."
            action={
              <DocLinkButton href="/startup/profile" role="startup" size="sm">
                Open my profile
              </DocLinkButton>
            }
          />
        )}

        {appsQuery.data && appsQuery.data.length > 0 && (
          <Card
            icon={<PieChart className="w-4 h-4" />}
            label="Where my bids stand"
            aside={<StatPill>{appsQuery.data.length} submitted</StatPill>}
            className="max-w-sm"
          >
            <ApplicationStatusDonut apps={appsQuery.data} unit="Mine" />
          </Card>
        )}

        {appsQuery.data && appsQuery.data.length > 0 && (
          <DocumentForm
            title="Submitted Proposals"
            subtitle="GET /applications?startup_id="
            refNumber="APP-REG"
            role="startup"
          >
            <div className="pt-2 divide-y divide-[#F0F0EA]">
              {appsQuery.data.map((app) => {
                const ps = psById.get(app.problem_statement_id);
                const title =
                  (app.technical_proposal?.title as string | undefined) ||
                  ps?.title ||
                  `Application #${app.id}`;

                return (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={app.status} />
                        <span className="font-mono text-[11px] text-[#9CA3AF]">
                          APP #{app.id} · PS #{app.problem_statement_id}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-[#18181B] truncate">{title}</div>
                      <div className="text-[11px] text-[#6B7280]">
                        {ps ? `${humanize(ps.category)} · ` : ''}
                        Submitted {fmtDateTime(app.created_at)}
                      </div>
                      <ApplicationStatusStepper status={app.status} className="max-w-md pt-1" />
                    </div>

                    <DocLinkButton
                      href={`/startup/applications/${app.id}`}
                      role="startup"
                      size="sm"
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Open
                    </DocLinkButton>
                  </div>
                );
              })}
            </div>
          </DocumentForm>
        )}
      </div>
    </AppLayout>
  );
}
