'use client';

/**
 * Officer overview.
 *
 * Two visuals, both real: a status donut aggregated across every application on
 * the officer's own problem statements, and a weekly capsule chart of when those
 * statements were created/published.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { QuickLink, Stat } from '@/components/shared/Dashboard';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ApplicationRead } from '@/lib/types/api';
import {
  Card,
  PageHeader,
  PillLink,
  StatPill,
} from '@/components/shared/design-system';
import {
  ApplicationStatusDonut,
  WeeklyActivityChart,
  bucketByWeek,
} from '@/components/shared/domain/Insights';
import {
  BarChart3,
  ClipboardList,
  FileText,
  PieChart,
  Plus,
  ScrollText,
  Send,
  Sliders,
} from 'lucide-react';

export default function OfficerDashboardPage() {
  const session = useSession();

  const ps = useQuery(() => api.getProblemStatements(), []);
  const mine = (ps.data ?? []).filter((p) => session && p.officer_id === session.userId);

  // Applications only list per problem statement, so the counts are a fan-out
  // over the officer's own statements.
  const apps = useQuery<ApplicationRead[]>(
    async () => {
      const lists = await Promise.all(
        mine.map((p) => api.getApplicationsForPS(p.id).catch(() => [] as ApplicationRead[])),
      );
      return lists.flat();
    },
    [mine.map((p) => p.id).join(',')],
    { enabled: Boolean(session) && !ps.loading },
  );

  const appRows = apps.data ?? [];
  const awaitingReview = appRows.filter((a) =>
    ['applied', 'under_review', 'under_evaluation'].includes(a.status),
  ).length;

  const activityBars = bucketByWeek(mine, (p) => p.published_at ?? p.created_at);

  return (
    <AppLayout allow="officer">
      <div className="space-y-6 pb-12">
        <PageHeader
          line1="Department"
          glyph={<Sliders className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Officer"
          line2="Portal and"
          accentGlyph={<Send className="w-5 h-5" />}
          line2Tail="Pilots"
          action={
            <PillLink href="/officer/problem-statements/new" icon={<Plus className="w-4 h-4" />}>
              New Problem Statement
            </PillLink>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Problem statements"
            value={mine.length}
            loading={ps.loading}
            error={ps.error}
            hint={`${mine.filter((p) => p.status === 'draft').length} still in draft`}
            href="/officer/problem-statements"
            icon={<FileText className="w-4 h-4" />}
          />
          <Stat
            label="Published"
            value={mine.filter((p) => p.status === 'published').length}
            loading={ps.loading}
            error={ps.error}
            hint="Open to applications"
            href="/officer/problem-statements"
            icon={<Send className="w-4 h-4" />}
          />
          <Stat
            label="Applications"
            value={apps.data?.length}
            loading={apps.loading}
            error={apps.error}
            hint={`${awaitingReview} awaiting review`}
            href="/officer/applications"
            icon={<ClipboardList className="w-4 h-4" />}
            accent
          />
          <Stat
            label="Selected"
            value={appRows.filter((a) =>
              ['selected', 'contracted', 'completed'].includes(a.status),
            ).length}
            loading={apps.loading}
            error={apps.error}
            hint="Pilots awarded"
            href="/officer/contracts"
            icon={<ScrollText className="w-4 h-4" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Addition 1 — weekly problem-statement activity */}
          <Card
            className="lg:col-span-2"
            icon={<BarChart3 className="w-4 h-4" />}
            label="Problem Statement Activity"
            aside={<StatPill tone={mine.length ? 'ink' : 'ghost'}>{mine.length} total</StatPill>}
          >
            <p className="text-[11px] text-gray-500 -mt-1 mb-3">
              Statements you opened, by week. Bars show counts, not scores.
            </p>
            <WeeklyActivityChart
              bars={mine.length > 0 ? activityBars : []}
              emptyLabel="No problem statements yet — draft one to get started."
            />
          </Card>

          {/* Addition 2 — status breakdown across every application on those PSs */}
          <Card
            icon={<PieChart className="w-4 h-4" />}
            label="Status Breakdown"
            aside={<span className="text-xs font-bold text-gray-400">All my PSs</span>}
          >
            <ApplicationStatusDonut
              apps={appRows}
              emptyLabel="No applications received yet."
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            href="/officer/problem-statements/new"
            title="Draft a problem statement"
            description="Start from the outcome you need. AI assist reviews it before you publish."
            icon={<Plus className="w-5 h-5" />}
          />
          <QuickLink
            href="/officer/applications"
            title="Work the queue"
            description="Eligibility, checklist verification, containment plans and selection."
            icon={<ClipboardList className="w-5 h-5" />}
          />
          <QuickLink
            href="/officer/contracts"
            title="Run the pilots"
            description="Milestones, KPI verdicts and the scale / iterate / stop decision."
            icon={<ScrollText className="w-5 h-5" />}
          />
        </div>
      </div>
    </AppLayout>
  );
}
