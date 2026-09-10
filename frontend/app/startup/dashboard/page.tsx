'use client';

/**
 * Startup overview.
 *
 * The reference design for the whole app — every other page composes the same
 * primitives out of `components/shared/design-system`. The tab strip mirrors the
 * role's top-level pages; selecting one navigates rather than swapping content,
 * because those pages already exist.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { AlertStrip } from '@/components/shared/DesignSystem';
import { LoadingBlock } from '@/components/shared/States';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';
import { StartupMetricCards } from '@/components/startup/StartupMetricCards';
import {
  ProfileReadinessCard,
  StatusBreakdownCard,
  SubmissionActivityCard,
} from '@/components/startup/StartupCharts';
import {
  ActionCard,
  PageHeader,
  TileLink,
} from '@/components/shared/design-system';
import {
  ClipboardList,
  Mail,
  Search,
  Sliders,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export default function StartupDashboardPage() {
  const session = useSession();

  const profile = useQuery(() => api.getMyProfile(), []);
  const apps = useQuery(() => api.getApplicationsForStartup(session!.userId), [session?.userId], {
    enabled: Boolean(session),
  });
  const matches = useQuery(() => api.getMatchedProblemStatements(), []);
  const invites = useQuery(() => orNull(api.getMyInvites()), []);

  const canApply = Boolean(profile.data?.compliance_verified_at && profile.data?.description);
  const appRows = apps.data ?? [];
  const activeAppsCount = appRows.filter(
    (a) => !['completed', 'not_selected'].includes(a.status),
  ).length;

  return (
    <AppLayout allow="startup">
      <div className="space-y-6 pb-12">
        <PageHeader
          line1="Startup"
          glyph={<Sliders className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Portal"
          line2="and"
          accentGlyph={<Sparkles className="w-5 h-5" />}
          line2Tail="Workflows"
        />

        {!session && <LoadingBlock label="Loading overview..." rows={2} />}

        {profile.data && !canApply && (
          <AlertStrip
            type="warning"
            title="Compliance Verification Required"
            message={
              !profile.data.description
                ? 'Level 2 capability profile incomplete. Add a description and TRL stage on your profile.'
                : 'Admin verification pending. Proposal submissions are locked until approved.'
            }
          />
        )}

        <StartupMetricCards
          appsCount={appRows.length}
          activeAppsCount={activeAppsCount}
          matchesCount={matches.data?.length ?? 0}
          recommendedCount={(matches.data ?? []).filter((m) => m.recommended).length}
          invitesCount={invites.data?.length ?? 0}
          isVerified={Boolean(profile.data?.compliance_verified_at)}
          loading={apps.loading || matches.loading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          <div className="lg:col-span-2 space-y-6">
            <SubmissionActivityCard apps={appRows} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatusBreakdownCard apps={appRows} />
              <ProfileReadinessCard profile={profile.data} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <TileLink
                href="/startup/profile"
                icon={<UserCheck className="w-4 h-4" />}
                label="TRL Profile"
              />
              <TileLink
                href="/startup/invites"
                icon={<Mail className="w-4 h-4" />}
                label="Invites"
              />
            </div>

            <div className="space-y-3">
              <ActionCard
                href="/startup/profile"
                icon={<UserCheck className="w-5 h-5" />}
                title="Level 2 Profile"
                hint="Update TRL stage and capability details for matching."
              />
              <ActionCard
                href="/startup/discover"
                icon={<Search className="w-5 h-5" />}
                title="Discover Statements"
                hint="Browse published problem statements & bid."
              />
              <ActionCard
                href="/startup/applications"
                icon={<ClipboardList className="w-5 h-5" />}
                title="Track Applications"
                hint="Track checklists, milestone approvals, and pilot outcomes."
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
