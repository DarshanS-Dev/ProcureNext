'use client';

/**
 * GET /problem-statements — the list is global for any authenticated user, so
 * the officer's own statements are separated out client-side by officer_id from
 * the JWT. Publish and close act directly from the row.
 */

import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DocButton,
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
import { WeeklyActivityChart, bucketByWeek } from '@/components/shared/domain/Insights';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDate, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { PSStatusEnum } from '@/lib/types/api';
import { ArrowRight, BarChart3, FileText, PlusCircle } from 'lucide-react';

export default function OfficerProblemStatementsPage() {
  const session = useSession();
  const psQuery = useQuery(() => api.getProblemStatements(), []);
  const action = useMutation();

  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<PSStatusEnum | ''>('');

  const rows = (psQuery.data ?? [])
    .filter((ps) => (scope === 'mine' && session ? ps.officer_id === session.userId : true))
    .filter((ps) => (status ? ps.status === status : true))
    .slice()
    .sort((a, b) => b.id - a.id);

  return (
    <AppLayout allow="officer">
      <div className="space-y-6">
        <PageHeader
          line1="Problem"
          glyph={<FileText className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Statements"
          subtitle="Draft, publish and close the challenges startups bid against."
          action={
            <PillLink href="/officer/problem-statements/new" icon={<PlusCircle className="w-4 h-4" />}>
              New Problem Statement
            </PillLink>
          }
        />

        {/* Addition 1 — lifecycle lanes: draft → published → closed, click to filter. */}
        {psQuery.data && (
          <div className="grid grid-cols-3 gap-3">
            {(['draft', 'published', 'closed'] as PSStatusEnum[]).map((lane, idx) => {
              const count = (psQuery.data ?? []).filter(
                (ps) => ps.status === lane && (scope === 'all' || ps.officer_id === session?.userId),
              ).length;
              const active = status === lane;
              return (
                <button
                  key={lane}
                  onClick={() => setStatus(active ? '' : lane)}
                  className={`text-left rounded-3xl p-5 border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#18181B] border-[#18181B] text-white'
                      : lane === 'published'
                        ? 'bg-[#D7FD44] border-[#C3EB30] text-[#18181B]'
                        : 'bg-white border-[#E5E5E0] text-[#18181B] hover:border-[#18181B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      0{idx + 1} · {lane}
                    </span>
                    {active && <StatPill tone="accent">Filtering</StatPill>}
                  </div>
                  <div className="text-4xl font-black tracking-tight mt-3">{count}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Addition 2 — when these statements were opened, by week. */}
        {rows.length > 0 && (
          <Card
            icon={<BarChart3 className="w-4 h-4" />}
            label="Weekly Activity"
            aside={<StatPill>{rows.length} shown</StatPill>}
          >
            <WeeklyActivityChart bars={bucketByWeek(rows, (ps) => ps.published_at ?? ps.created_at)} />
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="w-48">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Scope
            </label>
            <DocSelect value={scope} onChange={(e) => setScope(e.target.value as 'mine' | 'all')}>
              <option value="mine">Mine only</option>
              <option value="all">All officers</option>
            </DocSelect>
          </div>
          <div className="w-48">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Status
            </label>
            <DocSelect value={status} onChange={(e) => setStatus(e.target.value as PSStatusEnum | '')}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </DocSelect>
          </div>
        </div>

        {action.error && <AlertStrip type="error" title="Action failed" message={action.error.detail} />}
        {action.success && <AlertStrip type="success" message={action.success} />}

        {(psQuery.loading || !session) && <LoadingBlock label="Loading problem statements…" />}
        {psQuery.error && <ApiErrorState error={psQuery.error} onRetry={psQuery.refetch} />}

        {psQuery.data && rows.length === 0 && (
          <EmptyState
            title={scope === 'mine' ? 'You have not created any yet' : 'Nothing matches these filters'}
            hint="A problem statement starts as a draft. Publishing it is what opens it to applications."
            action={
              <DocLinkButton href="/officer/problem-statements/new" role="officer" size="sm">
                Create the first one
              </DocLinkButton>
            }
          />
        )}

        {rows.length > 0 && (
          <DocumentForm
            title="Problem Statement Register"
            subtitle="GET /problem-statements"
            refNumber="PS-REG"
            role="officer"
          >
            <div className="pt-2 divide-y divide-[#F0F0EA]">
              {rows.map((ps) => {
                const isMine = session?.userId === ps.officer_id;
                return (
                  <div
                    key={ps.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={ps.status} />
                        <span className="font-mono text-[11px] text-[#9CA3AF]">PS #{ps.id}</span>
                        {!isMine && (
                          <span className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                            Officer #{ps.officer_id}
                          </span>
                        )}
                        {!ps.is_locked_field_editable && (
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#FEF6E7', color: '#B45309' }}
                            title="Applications exist, so the locked fields can no longer change"
                          >
                            Fields locked
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-[#18181B]">{ps.title}</div>
                      <div className="text-[11px] text-[#6B7280]">
                        {humanize(ps.category)}
                        {ps.budget_range ? ` · ${humanize(ps.budget_range)}` : ''} · Created{' '}
                        {fmtDate(ps.created_at)}
                        {ps.published_at ? ` · Published ${fmtDate(ps.published_at)}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMine && ps.status === 'draft' && (
                        <DocButton
                          size="sm"
                          variant="secondary"
                          role="officer"
                          disabled={action.pending}
                          onClick={() =>
                            action.run(() => api.publishProblemStatement(ps.id), {
                              successMessage: `PS #${ps.id} published.`,
                              onSuccess: () => psQuery.refetch(),
                            })
                          }
                        >
                          Publish
                        </DocButton>
                      )}
                      {isMine && ps.status === 'published' && (
                        <DocButton
                          size="sm"
                          variant="danger"
                          disabled={action.pending}
                          onClick={() =>
                            action.run(() => api.closeProblemStatement(ps.id), {
                              successMessage: `PS #${ps.id} closed.`,
                              onSuccess: () => psQuery.refetch(),
                            })
                          }
                        >
                          Close
                        </DocButton>
                      )}
                      <DocLinkButton
                        href={`/officer/problem-statements/${ps.id}`}
                        role="officer"
                        size="sm"
                        icon={<ArrowRight className="w-3 h-3" />}
                      >
                        Open
                      </DocLinkButton>
                    </div>
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
