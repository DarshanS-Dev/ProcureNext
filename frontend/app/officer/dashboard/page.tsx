'use client';

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { PageHeader } from '@/components/shared/DesignSystem';
import { QuickLink, Stat } from '@/components/shared/Dashboard';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ApplicationRead } from '@/lib/types/api';

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

  const awaitingReview = (apps.data ?? []).filter((a) =>
    ['applied', 'under_review', 'under_evaluation'].includes(a.status),
  ).length;

  return (
    <AppLayout allow="officer">
      <div className="space-y-6">
        <PageHeader
          title="Officer Overview"
          subtitle="Your problem statements and the applications waiting on you."
          role="officer"
          breadcrumb={[{ label: 'Officer' }, { label: 'Overview' }]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            role="officer"
            label="Problem statements"
            value={mine.length}
            loading={ps.loading}
            error={ps.error}
            hint={`${mine.filter((p) => p.status === 'draft').length} still in draft`}
            href="/officer/problem-statements"
          />
          <Stat
            role="officer"
            label="Published"
            value={mine.filter((p) => p.status === 'published').length}
            loading={ps.loading}
            error={ps.error}
            hint="Open to applications"
            href="/officer/problem-statements"
          />
          <Stat
            role="officer"
            label="Applications"
            value={apps.data?.length}
            loading={apps.loading}
            error={apps.error}
            hint={`${awaitingReview} awaiting review`}
            href="/officer/applications"
          />
          <Stat
            role="officer"
            label="Selected"
            value={(apps.data ?? []).filter((a) =>
              ['selected', 'contracted', 'completed'].includes(a.status),
            ).length}
            loading={apps.loading}
            error={apps.error}
            hint="Pilots awarded"
            href="/officer/contracts"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            role="officer"
            href="/officer/problem-statements/new"
            title="Draft a problem statement"
            description="Start from the outcome you need. AI assist reviews it before you publish."
          />
          <QuickLink
            role="officer"
            href="/officer/applications"
            title="Work the queue"
            description="Eligibility, checklist verification, containment plans and selection."
          />
          <QuickLink
            role="officer"
            href="/officer/contracts"
            title="Run the pilots"
            description="Milestones, KPI verdicts and the scale / iterate / stop decision."
          />
        </div>
      </div>
    </AppLayout>
  );
}
