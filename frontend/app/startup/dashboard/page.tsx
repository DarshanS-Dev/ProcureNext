'use client';

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { AlertStrip, PageHeader } from '@/components/shared/DesignSystem';
import { QuickLink, Stat } from '@/components/shared/Dashboard';
import { LoadingBlock } from '@/components/shared/States';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { useSession } from '@/lib/auth/session';

export default function StartupDashboardPage() {
  const session = useSession();

  const profile = useQuery(() => api.getMyProfile(), []);
  const apps = useQuery(() => api.getApplicationsForStartup(session!.userId), [session?.userId], {
    enabled: Boolean(session),
  });
  const matches = useQuery(() => api.getMatchedProblemStatements(), []);
  // The invite router is not mounted, so treat a 404 as "no invites" here
  // rather than letting it look like a failure on the dashboard.
  const invites = useQuery(() => orNull(api.getMyInvites()), []);

  const canApply = Boolean(profile.data?.compliance_verified_at && profile.data?.description);
  const active = (apps.data ?? []).filter(
    (a) => !['completed', 'not_selected'].includes(a.status),
  ).length;

  return (
    <AppLayout allow="startup">
      <div className="space-y-6">
        <PageHeader
          title="Startup Overview"
          subtitle="Where your applications stand and what is open to bid on."
          role="startup"
          breadcrumb={[{ label: 'Startup' }, { label: 'Overview' }]}
        />

        {!session && <LoadingBlock label="Loading…" rows={2} />}

        {profile.data && !canApply && (
          <AlertStrip
            type="warning"
            title="You cannot apply yet"
            message={
              !profile.data.description
                ? 'Your Level 2 capability profile is incomplete. Add a description and TRL stage on your profile page.'
                : 'An admin has not verified your compliance details yet. Applications are blocked until they do.'
            }
          />
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            role="startup"
            label="Applications"
            value={apps.data?.length}
            loading={apps.loading}
            error={apps.error}
            hint={`${active} still in progress`}
            href="/startup/applications"
          />
          <Stat
            role="startup"
            label="Recommended"
            value={(matches.data ?? []).filter((m) => m.recommended).length}
            loading={matches.loading}
            error={matches.error}
            hint="Matched to your profile"
            href="/startup/discover"
          />
          <Stat
            role="startup"
            label="Open to bid"
            value={matches.data?.length}
            loading={matches.loading}
            error={matches.error}
            hint="Published problem statements"
            href="/startup/discover"
          />
          <Stat
            role="startup"
            label="Direct invites"
            value={invites.data?.length ?? 0}
            loading={invites.loading}
            error={invites.error}
            hint="From officers"
            href="/startup/invites"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            role="startup"
            href="/startup/profile"
            title="Complete your profile"
            description="Level 2 capability data drives semantic matching and unlocks applying."
          />
          <QuickLink
            role="startup"
            href="/startup/discover"
            title="Discover problem statements"
            description="Browse everything published, with your matches flagged first."
          />
          <QuickLink
            role="startup"
            href="/startup/applications"
            title="Track your applications"
            description="Eligibility, checklist uploads, milestones and pilot outcome."
          />
        </div>
      </div>
    </AppLayout>
  );
}
