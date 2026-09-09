'use client';

/**
 * GET /startup/invites — direct invitations from officers.
 *
 * InviteRead carries only ids, so problem statement titles are joined in from
 * GET /problem-statements (readable by any authenticated user).
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
  humanize,
} from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { ArrowRight } from 'lucide-react';

export default function StartupInvitesPage() {
  const invitesQuery = useQuery(() => api.getMyInvites(), []);
  const psQuery = useQuery(() => api.getProblemStatements(), []);

  const psById = new Map((psQuery.data ?? []).map((ps) => [ps.id, ps]));

  return (
    <AppLayout allow="startup">
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Direct Invites"
          subtitle="Problem statements an officer invited you to bid on."
          phase="Invite"
          role="startup"
          breadcrumb={[{ label: 'Startup', href: '/startup/dashboard' }, { label: 'Invites' }]}
        />

        {invitesQuery.loading && <LoadingBlock label="Loading invites…" />}

        {invitesQuery.error && (
          <ApiErrorState error={invitesQuery.error} onRetry={invitesQuery.refetch} />
        )}

        {invitesQuery.data && invitesQuery.data.length === 0 && (
          <EmptyState
            title="No invites yet"
            hint="Officers send targeted invites based on semantic match with your Level 2 capability description. You can still apply to anything published from Discover."
            action={
              <DocLinkButton href="/startup/discover" role="startup" size="sm">
                Browse open problem statements
              </DocLinkButton>
            }
          />
        )}

        {invitesQuery.data && invitesQuery.data.length > 0 && (
          <DocumentForm
            title="Received Invites"
            subtitle="GET /startup/invites"
            refNumber="INV-REG"
            role="startup"
          >
            <div className="pt-2 divide-y divide-[#F0F0EA]">
              {invitesQuery.data.map((inv) => {
                const ps = psById.get(inv.problem_statement_id);
                return (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status="info" label="Invited" />
                        <span className="font-mono text-[11px] text-[#9CA3AF]">
                          PS #{inv.problem_statement_id}
                        </span>
                        {ps && <StatusBadge status={ps.status} />}
                      </div>
                      <div className="font-bold text-sm text-[#18181B]">
                        {ps ? ps.title : `Problem statement #${inv.problem_statement_id}`}
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        {ps ? `${humanize(ps.category)} · ` : ''}
                        Invited {fmtDateTime(inv.invited_at)}
                      </div>
                    </div>

                    <DocLinkButton
                      href={`/startup/applications/new?ps_id=${inv.problem_statement_id}`}
                      role="startup"
                      size="sm"
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Apply
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
