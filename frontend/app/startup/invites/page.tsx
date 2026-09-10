'use client';

/**
 * GET /startup/invites — direct invitations from officers.
 *
 * InviteRead carries only ids, so problem statement titles are joined in from
 * GET /problem-statements. Whether an invite was acted on is derived by
 * matching it against the startup's own applications — the same rule the
 * backend uses for `converted` on the officer's side.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { LoadingBlock, ApiErrorState, fmtDateTime, humanize } from '@/components/shared/States';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import {
  BigStat,
  Card,
  EmptyState,
  IconBadge,
  PageHeader,
  PillLink,
  ProgressCapsule,
  StatPill,
} from '@/components/shared/design-system';
import { ArrowRight, Clock, Mail, Search, Sparkles } from 'lucide-react';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function StartupInvitesPage() {
  const session = useSession();
  const invitesQuery = useQuery(() => api.getMyInvites(), []);
  const psQuery = useQuery(() => api.getProblemStatements(), []);
  const appsQuery = useQuery(
    () => orNull(api.getApplicationsForStartup(session!.userId)),
    [session?.userId],
    { enabled: Boolean(session) },
  );

  const psById = new Map((psQuery.data ?? []).map((ps) => [ps.id, ps]));
  const appliedPs = new Set((appsQuery.data ?? []).map((a) => a.problem_statement_id));
  const invites = invitesQuery.data ?? [];
  const converted = invites.filter((i) => appliedPs.has(i.problem_statement_id)).length;
  const stillOpen = invites.filter(
    (i) => psById.get(i.problem_statement_id)?.status === 'published' && !appliedPs.has(i.problem_statement_id),
  ).length;

  return (
    <AppLayout allow="startup">
      <div className="space-y-6 pb-12">
        <PageHeader
          line1="Direct"
          glyph={<Mail className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Invites"
          subtitle="Problem statements an officer invited you to bid on."
          action={
            <PillLink href="/startup/discover" icon={<Search className="w-4 h-4" />}>
              Explore Opportunities
            </PillLink>
          }
        />

        {invitesQuery.loading && <LoadingBlock label="Loading invites…" />}
        {invitesQuery.error && (
          <ApiErrorState error={invitesQuery.error} onRetry={invitesQuery.refetch} />
        )}

        {invitesQuery.data && invites.length === 0 && (
          <EmptyState
            icon={<Mail className="w-5 h-5" />}
            title="No invites yet"
            hint="Officers send targeted invites based on semantic match with your Level 2 capability description. You can still apply to anything published from Discover."
            action={<PillLink href="/startup/discover">Browse open problem statements</PillLink>}
          />
        )}

        {invites.length > 0 && (
          <>
            {/* Addition 1 — conversion: how many invites you actually answered. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card icon={<Mail className="w-4 h-4" />} label="Received">
                <BigStat value={invites.length} unit="invites" />
              </Card>
              <Card
                icon={<Sparkles className="w-4 h-4" />}
                label="Answered"
                aside={
                  <StatPill>{Math.round((converted / invites.length) * 100)}%</StatPill>
                }
                className="!bg-[#D7FD44] !border-[#C3EB30]"
              >
                <BigStat value={converted} unit="applied" />
                <ProgressCapsule filled={converted} total={invites.length} onAccent className="mt-4" />
              </Card>
              <Card icon={<Clock className="w-4 h-4" />} label="Still open">
                <BigStat value={stillOpen} unit="awaiting your bid" />
              </Card>
            </div>

            {/* Addition 2 — each invite as a card with an age meter: how long
                it has been sitting, capped at 30 days. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invites.map((inv) => {
                const ps = psById.get(inv.problem_statement_id);
                const applied = appliedPs.has(inv.problem_statement_id);
                const ageDays = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(inv.invited_at).getTime()) / DAY_MS),
                );
                const ageRatio = Math.min(1, ageDays / 30);

                return (
                  <div
                    key={inv.id}
                    className="bg-white rounded-3xl border border-[#E5E5E0] shadow-sm p-5 flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <IconBadge
                          icon={<Mail className="w-4 h-4" />}
                          tone={applied ? 'accent' : 'muted'}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#18181B] leading-snug">
                            {ps ? ps.title : `Problem statement #${inv.problem_statement_id}`}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {ps ? `${humanize(ps.category)} · ` : ''}PS #{inv.problem_statement_id}
                          </div>
                        </div>
                      </div>
                      <StatPill tone={applied ? 'ok' : ps?.status === 'published' ? 'ink' : 'ghost'}>
                        {applied ? 'Applied' : ps?.status === 'published' ? 'Open' : humanize(ps?.status)}
                      </StatPill>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1.5">
                        <span>Invited {fmtDateTime(inv.invited_at)}</span>
                        <span>{ageDays}d ago</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F3F3EE] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#18181B]"
                          style={{ width: `${Math.max(4, ageRatio * 100)}%` }}
                        />
                      </div>
                    </div>

                    {!applied && ps?.status === 'published' && (
                      <PillLink
                        href={`/startup/applications/new?ps_id=${inv.problem_statement_id}`}
                        icon={<ArrowRight className="w-4 h-4" />}
                        className="w-full"
                      >
                        Apply
                      </PillLink>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
