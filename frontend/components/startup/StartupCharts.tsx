'use client';

/**
 * Startup dashboard visuals.
 *
 * These used to hold hardcoded series (fixed dates, invented match scores, a
 * "92 / 100 verification index" that no endpoint returns). They now take the
 * rows the dashboard already fetches and render only those; when a startup has
 * no applications yet, they say so instead of drawing a shape.
 */

import React from 'react';
import { BarChart3, PieChart, ShieldCheck } from 'lucide-react';
import {
  Card,
  CapsuleBar,
  CapsuleBarChart,
  DonutRing,
  RadarChart,
  StatPill,
  seriesColors,
} from '@/components/shared/design-system';
import type { ApplicationRead, StartupProfileRead } from '@/lib/types/api';
import { humanize } from '@/components/shared/States';

// ── 1. Submission activity ────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Applications submitted per day over the trailing `days` window. */
export function buildActivityBars(apps: ApplicationRead[], days = 8): CapsuleBar[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: { label: string; key: number; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * DAY_MS);
    buckets.push({
      label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      key: day.getTime(),
      count: 0,
    });
  }

  for (const app of apps) {
    const created = new Date(app.created_at);
    if (Number.isNaN(created.getTime())) continue;
    created.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.key === created.getTime());
    if (bucket) bucket.count += 1;
  }

  const peak = Math.max(1, ...buckets.map((b) => b.count));
  return buckets.map((b) => ({
    label: b.label,
    value: b.count / peak,
    badge: b.count > 0 ? String(b.count) : null,
  }));
}

export const SubmissionActivityCard: React.FC<{
  apps: ApplicationRead[];
  className?: string;
}> = ({ apps, className = '' }) => {
  const bars = buildActivityBars(apps);
  const total = apps.length;

  return (
    <Card
      icon={<BarChart3 className="w-4 h-4" />}
      label="Application Activity"
      aside={<StatPill tone={total ? 'ink' : 'ghost'}>{total} total</StatPill>}
      className={className}
    >
      <p className="text-[11px] text-gray-500 -mt-1 mb-3">
        Applications you submitted, by day, over the last 8 days.
      </p>
      <CapsuleBarChart
        bars={total > 0 ? bars : []}
        ticks={[]}
        emptyLabel="No applications submitted yet — bars appear once you bid."
      />
    </Card>
  );
};

// ── 2. Status breakdown ───────────────────────────────────────

/** Real `Application.status` counts, in pipeline order. */
const STATUS_ORDER = [
  'applied',
  'under_review',
  'under_evaluation',
  'selected',
  'contracted',
  'completed',
  'not_selected',
] as const;

export const StatusBreakdownCard: React.FC<{
  apps: ApplicationRead[];
  className?: string;
}> = ({ apps, className = '' }) => {
  const slices = STATUS_ORDER.map((status, idx) => ({
    label: humanize(status),
    count: apps.filter((a) => a.status === status).length,
    color: status === 'not_selected' ? '#94A3B8' : seriesColors[idx % seriesColors.length],
  }));

  return (
    <Card
      icon={<PieChart className="w-4 h-4" />}
      label="Status Breakdown"
      aside={<span className="text-xs font-bold text-gray-400">Pipeline</span>}
      className={className}
    >
      <DonutRing
        slices={slices}
        unit="Applications"
        emptyLabel="No applications yet."
      />
    </Card>
  );
};

// ── 3. Profile readiness ──────────────────────────────────────

/**
 * Five axes, each a real completeness/verification ratio off StartupProfile.
 * This is not a score the backend computes — it is field presence, and the card
 * says so, because inventing a "readiness index" would imply a model that does
 * not exist.
 */
export function buildReadinessAxes(profile: StartupProfileRead) {
  const filled = (...values: unknown[]) =>
    values.filter((v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ''))
      .length / values.length;

  return [
    { label: 'TRL', value: (profile.trl_stage ?? 0) / 9 },
    {
      label: 'Compliance',
      value:
        [
          profile.dpiit_status === 'verified',
          profile.entity_verified,
          profile.pan_verified,
          profile.gst_verified,
        ].filter(Boolean).length / 4,
    },
    { label: 'Capability', value: filled(profile.description, profile.tech_stack, profile.architecture) },
    { label: 'Team', value: filled(profile.team_headcount, profile.funding_band, profile.stage) },
    { label: 'Track record', value: filled(profile.past_deployments, profile.api_available, profile.sector_tags) },
  ];
}

export const ProfileReadinessCard: React.FC<{
  profile: StartupProfileRead | undefined;
  className?: string;
}> = ({ profile, className = '' }) => (
  <Card
    icon={<ShieldCheck className="w-4 h-4" />}
    label="Profile Readiness"
    aside={
      <StatPill tone={profile?.trl_stage ? 'accent' : 'ghost'}>
        {profile?.trl_stage ? `TRL ${profile.trl_stage}` : 'TRL not set'}
      </StatPill>
    }
    className={className}
  >
    {profile ? (
      <>
        <RadarChart axes={buildReadinessAxes(profile)} size={190} className="mx-auto" />
        <div className="bg-[#F8F8F4] p-2.5 rounded-2xl flex items-center justify-between text-[11px] mt-2">
          <span className="font-semibold text-gray-600">Compliance verified</span>
          <span className="font-black text-[#18181B]">
            {profile.compliance_verified_at ? 'Yes' : 'Pending'}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
          Axes show which profile fields are filled and verified — not a computed score.
        </p>
      </>
    ) : (
      <div className="py-10 text-center text-xs text-gray-400">Profile not loaded.</div>
    )}
  </Card>
);
