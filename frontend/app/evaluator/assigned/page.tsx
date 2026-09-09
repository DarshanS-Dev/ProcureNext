'use client';

/**
 * The evaluator's assigned problem statements.
 *
 * Derived rather than fetched directly: there is no "problem statements
 * assigned to me" route, so this reads GET /problem-statements and keeps the
 * ones whose GET /problem-statements/{id}/evaluators list contains this user.
 *
 * Note the gap this page has to work around: an evaluator cannot enumerate the
 * applications under an assigned problem statement. GET /applications
 * ?problem_statement_id= is officer/admin only, while GET /applications/{id} is
 * open to an assigned evaluator. So the applications are reachable one id at a
 * time, and the form below is how you get there.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocInput,
  PageHeader,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDate, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { ProblemStatementRead } from '@/lib/types/api';
import { ArrowRight } from 'lucide-react';

export default function EvaluatorAssignedPage() {
  const session = useSession();
  const router = useRouter();
  const [appId, setAppId] = useState('');

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
          title="Assigned Work"
          subtitle="Problem statements an admin has put you on the panel for."
          phase="Layer 4 · Evaluation"
          role="evaluator"
          breadcrumb={[{ label: 'Evaluator', href: '/evaluator/dashboard' }, { label: 'Assigned' }]}
        />

        <DataCard>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#18181B]">Open an application</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Enter the application id you were asked to score. The API does not
                expose a list of applications to evaluators, so the officer running
                the problem statement supplies the ids.
              </p>
            </div>
            <form
              className="flex gap-2 items-end max-w-sm"
              onSubmit={(e) => {
                e.preventDefault();
                if (appId.trim()) router.push(`/evaluator/applications/${appId.trim()}`);
              }}
            >
              <div className="flex-1">
                <DocInput
                  lineStyle={false}
                  type="number"
                  min={1}
                  placeholder="Application id"
                  aria-label="Application id"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
              </div>
              <DocButton
                type="submit"
                size="sm"
                variant="primary"
                role="evaluator"
                disabled={!appId.trim()}
                icon={<ArrowRight className="w-3 h-3" />}
              >
                Open
              </DocButton>
            </form>
          </div>
        </DataCard>

        {(assigned.loading || !session) && <LoadingBlock label="Checking your assignments…" />}
        {assigned.error && <ApiErrorState error={assigned.error} onRetry={assigned.refetch} />}

        {assigned.data && assigned.data.length === 0 && (
          <EmptyState
            title="You are not on any panels yet"
            hint="A platform admin assigns evaluators to a problem statement. Once assigned, it appears here."
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(assigned.data ?? []).map((ps) => (
            <DataCard key={ps.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <StatusBadge status={ps.status} />
                <span className="font-mono text-[11px] text-[#9CA3AF]">PS #{ps.id}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#18181B] leading-snug">{ps.title}</h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  {humanize(ps.category)} · created {fmtDate(ps.created_at)}
                </p>
              </div>
              {ps.description && (
                <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-3">
                  {ps.description}
                </p>
              )}
              <div
                className="p-2.5 rounded-lg text-[11px] text-[#6B7280]"
                style={{ backgroundColor: '#F4F4EF', border: '1px solid #E5E5E0' }}
              >
                <span className="font-bold">Success condition:</span>{' '}
                {ps.success_condition || 'Not stated'}
              </div>
            </DataCard>
          ))}
        </div>

        <AlertStrip
          type="info"
          title="Before you score"
          message="A conflict-of-interest declaration is mandatory on every application and can only be submitted once. Declaring a conflict recuses you from that application automatically."
        />
      </div>
    </AppLayout>
  );
}
