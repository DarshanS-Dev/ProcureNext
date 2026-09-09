'use client';

/**
 * The three headline cards on the startup dashboard, rebuilt on the shared
 * design system so the same shapes are reusable by the other roles.
 *
 * The progress capsule on card 1 used to measure against an invented "target of
 * 10 applications". It now shows how many of the startup's own applications are
 * still live, which is a real ratio.
 */

import React from 'react';
import { ClipboardList, Search, ShieldCheck } from 'lucide-react';
import {
  BigStat,
  Card,
  CardLink,
  HeroCard,
  ProgressCapsule,
  StatPill,
} from '@/components/shared/design-system';

interface StartupMetricCardsProps {
  appsCount?: number;
  activeAppsCount?: number;
  matchesCount?: number;
  recommendedCount?: number;
  invitesCount?: number;
  isVerified?: boolean;
  loading?: boolean;
}

const SEGMENTS = 8;

/** Fills `n` of 8 segments proportionally, showing at least one when n > 0. */
const segmentsFor = (part: number, whole: number) => {
  if (whole <= 0 || part <= 0) return 0;
  return Math.max(1, Math.round((part / whole) * SEGMENTS));
};

export const StartupMetricCards: React.FC<StartupMetricCardsProps> = ({
  appsCount = 0,
  activeAppsCount = 0,
  matchesCount = 0,
  recommendedCount = 0,
  invitesCount = 0,
  isVerified = false,
  loading = false,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* 1 — Applications */}
    <Card
      icon={<ClipboardList className="w-4 h-4" />}
      label="My Applications"
      aside={<span className="text-xs font-bold text-gray-400">{activeAppsCount} Active</span>}
      footer={
        <>
          <span>{activeAppsCount} in progress</span>
          <CardLink href="/startup/applications">Track</CardLink>
        </>
      }
    >
      <div className="flex items-center gap-2">
        <BigStat value={loading ? '—' : appsCount} unit="submitted" />
        <StatPill className="ml-auto">
          {appsCount > 0 ? `${Math.round((activeAppsCount / appsCount) * 100)}% live` : '—'}
        </StatPill>
      </div>
      <ProgressCapsule
        filled={segmentsFor(activeAppsCount, appsCount)}
        total={SEGMENTS}
        className="mt-4"
      />
    </Card>

    {/* 2 — Matched problem statements (the page's one lime card) */}
    <Card
      icon={<Search className="w-4 h-4" />}
      label="Matched Statements"
      aside={<StatPill tone="white">{recommendedCount} Recommended</StatPill>}
      className="!bg-[#D7FD44] !border-[#C3EB30]"
      footer={
        <>
          <span className="text-[#18181B]/80 font-bold">Invites: {invitesCount}</span>
          <CardLink href="/startup/discover">Discover</CardLink>
        </>
      }
    >
      <BigStat value={loading ? '—' : matchesCount} unit="open to bid" />
      <ProgressCapsule
        filled={segmentsFor(recommendedCount, matchesCount)}
        total={SEGMENTS}
        onAccent
        className="mt-4"
      />
    </Card>

    {/* 3 — Compliance gate */}
    <HeroCard
      icon={<ShieldCheck className="w-4 h-4" />}
      label="TRL & Compliance"
      state={isVerified ? 'ready' : 'ink'}
      aside={
        <StatPill tone={isVerified ? 'ink' : 'warn'}>
          {isVerified ? 'Verified' : 'Action Needed'}
        </StatPill>
      }
      title="Level 2 Capability Profile"
      body={
        isVerified
          ? 'Your TRL level and compliance profile are active for semantic matching.'
          : 'Complete your description and TRL stage to unlock applying.'
      }
      action={{
        label: isVerified ? 'View Profile' : 'Complete Profile',
        href: '/startup/profile',
      }}
    />
  </div>
);
