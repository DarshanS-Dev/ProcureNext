'use client';

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { AlertStrip, PageHeader } from '@/components/shared/DesignSystem';
import { QuickLink, Stat } from '@/components/shared/Dashboard';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ProblemStatementRead } from '@/lib/types/api';

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

  return (
    <AppLayout allow="evaluator">
      <div className="space-y-6">
        <PageHeader
          title="Evaluator Overview"
          subtitle="The panels you sit on and the rubric you score against."
          role="evaluator"
          breadcrumb={[{ label: 'Evaluator' }, { label: 'Overview' }]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat
            role="evaluator"
            label="Assigned panels"
            value={assigned.data?.length}
            loading={assigned.loading}
            error={assigned.error}
            hint="Problem statements you evaluate"
            href="/evaluator/assigned"
          />
          <Stat
            role="evaluator"
            label="Published of those"
            value={(assigned.data ?? []).filter((p) => p.status === 'published').length}
            loading={assigned.loading}
            error={assigned.error}
            hint="Currently taking applications"
            href="/evaluator/assigned"
          />
          <Stat
            role="evaluator"
            label="Rubric criteria"
            value={criteria.data?.length}
            loading={criteria.loading}
            error={criteria.error}
            hint="Scored on every application"
          />
        </div>

        <AlertStrip
          type="info"
          title="How scoring works here"
          message="Declare a conflict of interest on an application before scoring it — the server rejects scores otherwise. All criteria are submitted in one go and cannot be revised."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickLink
            role="evaluator"
            href="/evaluator/assigned"
            title="See your assigned work"
            description="The problem statements you are on the panel for, and the way in to an application."
          />
          <QuickLink
            role="evaluator"
            href="/evaluator/assigned"
            title="Open an application by id"
            description="Applications are not listable for evaluators — the owning officer supplies the ids."
          />
        </div>
      </div>
    </AppLayout>
  );
}
