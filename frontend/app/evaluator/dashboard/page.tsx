'use client';

/**
 * Evaluator overview.
 *
 * Two visuals, both real: the rubric's own weights drawn as capsule bars (so an
 * evaluator sees where the marks are before scoring), and a donut of the
 * panels they sit on by problem-statement status.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { QuickLink, Stat } from '@/components/shared/Dashboard';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ProblemStatementRead } from '@/lib/types/api';
import {
  CapsuleBarChart,
  Card,
  DonutRing,
  HeroCard,
  PageHeader,
  StatPill,
} from '@/components/shared/design-system';
import { BarChart3, FileText, ListChecks, PieChart, Scale, ShieldAlert, Sliders } from 'lucide-react';

export default function EvaluatorDashboardPage() {
  const session = useSession();
  const criteria = useQuery(() => api.getRubricCriteria(), []);

  const assigned = useQuery<ProblemStatementRead[]>(
    async () => {
      const all = await api.getProblemStatements();
      const checks = await Promise.all(
        all.map(async (ps) => {
          try {
            const evaluators = await api.getEvaluatorAssignments(ps.id);
            return evaluators.some((a) => a.evaluator_id === session!.userId) ? ps : null;
          } catch {
            return null;
          }
        }),
      );
      return checks.filter((ps): ps is ProblemStatementRead => ps !== null);
    },
    [session?.userId],
    { enabled: Boolean(session) },
  );

  const panels = assigned.data ?? [];
  const rubric = criteria.data ?? [];
  const maxWeight = Math.max(1, ...rubric.map((c) => c.weight));

  return (
    <AppLayout allow="evaluator">
      <div className="space-y-6 pb-12">
        <PageHeader
          line1="Evaluator"
          glyph={<Sliders className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Panel"
          line2="and"
          accentGlyph={<Scale className="w-5 h-5" />}
          line2Tail="Rubric"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat
            label="Assigned panels"
            value={assigned.data?.length}
            loading={assigned.loading}
            error={assigned.error}
            hint="Problem statements you evaluate"
            href="/evaluator/assigned"
            icon={<FileText className="w-4 h-4" />}
            accent
          />
          <Stat
            label="Published of those"
            value={panels.filter((p) => p.status === 'published').length}
            loading={assigned.loading}
            error={assigned.error}
            hint="Currently taking applications"
            href="/evaluator/assigned"
            icon={<ListChecks className="w-4 h-4" />}
          />
          <HeroCard
            icon={<ShieldAlert className="w-4 h-4" />}
            label="Before you score"
            title="Declare COI first"
            body="The server rejects a score sheet until a conflict-of-interest declaration exists. All criteria go in one submission and cannot be revised."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Addition 1 — where the marks are: real rubric weights. */}
          <Card
            className="lg:col-span-2"
            icon={<BarChart3 className="w-4 h-4" />}
            label="Rubric Weights"
            aside={
              <StatPill tone={rubric.length ? 'ink' : 'ghost'}>
                {rubric.reduce((sum, c) => sum + c.weight, 0)} pts
              </StatPill>
            }
          >
            <p className="text-[11px] text-gray-500 -mt-1 mb-3">
              From <span className="font-mono">/rubric-criteria</span> — the weight each criterion carries in the total.
            </p>
            <CapsuleBarChart
              ticks={[]}
              emptyLabel={criteria.loading ? 'Loading rubric…' : 'No rubric criteria configured.'}
              bars={rubric.map((c) => ({
                label: c.name.split(' ')[0],
                value: c.weight / maxWeight,
                badge: `${c.weight}`,
              }))}
            />
          </Card>

          {/* Addition 2 — the panels you sit on, by lifecycle status. */}
          <Card
            icon={<PieChart className="w-4 h-4" />}
            label="My Panels"
            aside={<span className="text-xs font-bold text-gray-400">By status</span>}
          >
            <DonutRing
              unit="Panels"
              emptyLabel={assigned.loading ? 'Loading…' : 'Not on any panel yet.'}
              slices={(['draft', 'published', 'closed'] as const).map((status) => ({
                label: status.charAt(0).toUpperCase() + status.slice(1),
                count: panels.filter((p) => p.status === status).length,
              }))}
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickLink
            href="/evaluator/assigned"
            title="See your assigned work"
            description="The problem statements you are on the panel for, and the way in to an application."
            icon={<ListChecks className="w-5 h-5" />}
          />
          <QuickLink
            href="/evaluator/assigned"
            title="Open an application by id"
            description="Applications are not listable for evaluators — the owning officer supplies the ids."
            icon={<FileText className="w-5 h-5" />}
          />
        </div>
      </div>
    </AppLayout>
  );
}
