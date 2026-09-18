'use client';

/**
 * Evaluator's assignment list — every Application under any Problem Statement
 * this evaluator is assigned to (GET /evaluators/me/applications), so they
 * can open one without needing to know/type its id.
 */

import React from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  DataCard,
  PageHeader,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
} from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';

export default function EvaluatorAssignedPage() {
  const appsQuery = useQuery(() => api.getMyEvaluatorAssignments(), []);

  return (
    <AppLayout allow="evaluator">
      <div className="space-y-6">
        <PageHeader
          title="Assigned Work"
          subtitle="Applications under problem statements you're assigned to evaluate."
          role="evaluator"
          breadcrumb={[
            { label: 'Evaluator', href: '/evaluator/dashboard' },
            { label: 'Assigned' },
          ]}
        />

        {appsQuery.loading && <LoadingBlock label="Loading assignments…" />}

        {appsQuery.error && (
          <ApiErrorState error={appsQuery.error} onRetry={appsQuery.refetch} />
        )}

        {appsQuery.data && appsQuery.data.length === 0 && (
          <EmptyState
            title="No assignments yet"
            hint="You haven't been assigned to any Problem Statement's evaluator pool. An admin assigns evaluators per Problem Statement."
          />
        )}

        {appsQuery.data && appsQuery.data.length > 0 && (
          <div className="space-y-3">
            {appsQuery.data.map((app) => (
              <Link key={app.id} href={`/evaluator/applications/${app.id}`}>
                <DataCard>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#18181B]">
                        {(app.technical_proposal?.title as string | undefined) ??
                          `Application #${app.id}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Application #{app.id} · PS #{app.problem_statement_id}
                      </div>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                </DataCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}


