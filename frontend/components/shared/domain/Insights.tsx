'use client';

/**
 * Domain-bound compositions of the design system.
 *
 * The design system knows about shapes; this file knows about ProcureNext's
 * tables. Each component below binds one real endpoint's shape to one primitive,
 * so the officer, startup and independent-evaluator screens that all show
 * "milestones" or "risk" render literally the same component.
 */

import React from 'react';
import {
  CapsuleBar,
  CapsuleBarChart,
  CapsuleGauge,
  DonutRing,
  DotTrack,
  StatPill,
  Stepper,
  seriesColors,
} from '@/components/shared/design-system';
import { humanize } from '@/components/shared/States';
import type {
  ApplicationRead,
  ApplicationStatusEnum,
  DecisionReadinessRead,
  EligibilityCheckRead,
  MilestoneTypeEnum,
  PilotMilestoneRead,
  RiskProfileRead,
} from '@/lib/types/api';

// ── Application status donut ──────────────────────────────────

/** Pipeline order, straight from `ApplicationStatusEnum`. */
export const APPLICATION_STATUSES: ApplicationStatusEnum[] = [
  'applied',
  'under_review',
  'under_evaluation',
  'selected',
  'contracted',
  'completed',
  'not_selected',
];

export const ApplicationStatusDonut: React.FC<{
  apps: ApplicationRead[];
  unit?: string;
  emptyLabel?: string;
  className?: string;
}> = ({ apps, unit = 'Applications', emptyLabel, className = '' }) => (
  <DonutRing
    className={className}
    unit={unit}
    emptyLabel={emptyLabel ?? 'No applications yet.'}
    slices={APPLICATION_STATUSES.map((status, idx) => ({
      label: humanize(status),
      count: apps.filter((a) => a.status === status).length,
      color: status === 'not_selected' ? '#94A3B8' : seriesColors[idx % seriesColors.length],
    }))}
  />
);

// ── Activity over time ────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Buckets any dated rows into trailing weeks. Used for problem-statement and
 * application activity — the bar height is a count, normalised to the peak, and
 * the badge shows the raw count so nothing is a mystery percentage.
 */
export function bucketByWeek<T>(
  rows: T[],
  dateOf: (row: T) => string | null | undefined,
  weeks = 8,
): CapsuleBar[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now.getTime() - now.getDay() * DAY_MS);

  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(startOfWeek.getTime() - (weeks - 1 - i) * 7 * DAY_MS);
    return {
      start: start.getTime(),
      end: start.getTime() + 7 * DAY_MS,
      label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      count: 0,
    };
  });

  for (const row of rows) {
    const raw = dateOf(row);
    if (!raw) continue;
    const at = new Date(raw).getTime();
    if (Number.isNaN(at)) continue;
    const bucket = buckets.find((b) => at >= b.start && at < b.end);
    if (bucket) bucket.count += 1;
  }

  const peak = Math.max(1, ...buckets.map((b) => b.count));
  return buckets.map((b) => ({
    label: b.label,
    value: b.count / peak,
    badge: b.count > 0 ? String(b.count) : null,
  }));
}

export const WeeklyActivityChart: React.FC<{
  bars: CapsuleBar[];
  emptyLabel?: string;
}> = ({ bars, emptyLabel }) => (
  <CapsuleBarChart bars={bars} ticks={[]} emptyLabel={emptyLabel} />
);

// ── Eligibility sub-checks ────────────────────────────────────

const ELIGIBILITY_FIELDS = [
  ['dpiit_verified', 'DPIIT'],
  ['entity_valid', 'Entity'],
  ['pan_gst_present', 'PAN/GST'],
  ['sector_eligible', 'Sector'],
  ['certification_check', 'Certification'],
] as const;

const checkTone = (value?: string | null) => {
  if (value === 'pass' || value === 'present' || value === 'not_required') return 'ok';
  if (value === 'fail' || value === 'absent') return 'danger';
  if (value === 'needs_clarification') return 'warn';
  return 'ghost';
};

/**
 * A compact dot row of the five eligibility sub-checks — small enough that a
 * list of applications stays scannable.
 */
export const EligibilityDots: React.FC<{
  check: EligibilityCheckRead | null | undefined;
  /** Show the field names next to each dot. */
  labelled?: boolean;
  className?: string;
}> = ({ check, labelled = false, className = '' }) => {
  if (!check) {
    return <span className={`text-[11px] text-gray-400 ${className}`}>Not reviewed yet</span>;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {ELIGIBILITY_FIELDS.map(([field, label]) => {
        const value = check[field] as string | null | undefined;
        const tone = checkTone(value);
        const color =
          tone === 'ok'
            ? '#1E9E5A'
            : tone === 'danger'
              ? '#C81E4A'
              : tone === 'warn'
                ? '#F59E0B'
                : '#D4D4CE';

        return labelled ? (
          <span
            key={field}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-600"
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
            <span className="text-gray-400 font-semibold">{humanize(value)}</span>
          </span>
        ) : (
          <span
            key={field}
            title={`${label}: ${humanize(value)}`}
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
};

// ── Risk gauges ───────────────────────────────────────────────

export const RISK_CATEGORIES = [
  ['technical_risk', 'Technical'],
  ['financial_risk', 'Financial'],
  ['implementation_risk', 'Implementation'],
  ['cybersecurity_risk', 'Cyber'],
  ['data_risk', 'Data'],
  ['scalability_risk', 'Scalability'],
] as const;

/**
 * One vertical gauge per risk category. When both a preliminary and a final
 * profile exist they render side by side, so the narrowing across the pipeline
 * is visible — `RiskProfile.stage` is a real column.
 */
export const RiskGaugeRow: React.FC<{
  profiles: RiskProfileRead[];
  className?: string;
}> = ({ profiles, className = '' }) => {
  const preliminary = profiles.find((p) => p.stage === 'preliminary');
  const final = profiles.find((p) => p.stage === 'final');
  const both = Boolean(preliminary && final);

  if (!preliminary && !final) {
    return (
      <div className={`py-8 text-center text-xs text-gray-400 ${className}`}>
        No risk profile computed yet.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {RISK_CATEGORIES.map(([field, label]) => (
          <div key={field} className="flex items-end justify-center gap-1">
            {preliminary && (
              <CapsuleGauge
                label={both ? '' : label}
                level={preliminary[field]}
                caption={both ? 'prelim' : undefined}
              />
            )}
            {final && (
              <CapsuleGauge
                label={both ? '' : label}
                level={final[field]}
                caption={both ? 'final' : undefined}
              />
            )}
          </div>
        ))}
      </div>
      {both && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-1">
          {RISK_CATEGORIES.map(([field, label]) => (
            <div key={field} className="text-center text-[10px] font-bold text-[#18181B]">
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Decision readiness ────────────────────────────────────────

export const READINESS_GATES = [
  ['eligibility_passed', 'Eligibility'],
  ['stage3_scoring_complete', 'Scoring'],
  ['no_unresolved_coi', 'COI'],
  ['commercial_unlocked', 'Commercial'],
  ['final_risk_profile_exists', 'Risk'],
  ['containment_plan_exists', 'Containment'],
] as const;

/** Six gates, grey until satisfied — all lime means Select is unlocked. */
export const ReadinessTrack: React.FC<{
  readiness: DecisionReadinessRead;
  className?: string;
}> = ({ readiness, className = '' }) => (
  <DotTrack
    className={className}
    dots={READINESS_GATES.map(([field, label]) => ({
      label,
      done: Boolean(readiness[field]),
    }))}
  />
);

// ── Milestone stepper ─────────────────────────────────────────

/** The fixed five, in `MilestoneTypeEnum` order. */
export const MILESTONE_ORDER: MilestoneTypeEnum[] = [
  'deployment',
  'field_testing',
  'outcome_measurement',
  'independent_verification',
  'final_decision',
];

const MILESTONE_LABELS: Record<MilestoneTypeEnum, string> = {
  deployment: 'Deployment',
  field_testing: 'Field Testing',
  outcome_measurement: 'Outcome Measurement',
  independent_verification: 'Independent Verification',
  final_decision: 'Final Decision',
};

/**
 * The five milestones with their real status and payment status. Pass
 * `highlight` to mark the one currently being worked on.
 */
export const MilestoneStepper: React.FC<{
  milestones: PilotMilestoneRead[];
  highlightId?: number;
  className?: string;
}> = ({ milestones, highlightId, className = '' }) => (
  <Stepper
    className={className}
    steps={MILESTONE_ORDER.map((type) => {
      const row = milestones.find((m) => m.milestone_type === type);
      const status = row?.status;
      const tone =
        status === 'accepted'
          ? 'done'
          : status === 'rejected'
            ? 'failed'
            : row?.id === highlightId || status === 'submitted' || status === 'in_progress'
              ? 'active'
              : 'pending';

      return {
        label: row?.display_name || MILESTONE_LABELS[type],
        state: status ? humanize(status) : 'not created',
        tone: tone as 'done' | 'active' | 'pending' | 'failed',
        meta: row ? humanize(row.payment_status) : undefined,
      };
    })}
  />
);

// ── Application status stepper ────────────────────────────────

const HAPPY_PATH: ApplicationStatusEnum[] = [
  'applied',
  'under_review',
  'under_evaluation',
  'selected',
  'contracted',
  'completed',
];

/**
 * The application's own state machine. `not_selected` is a branch off the path
 * rather than a stage, matching how the backend reconstructs it.
 */
export const ApplicationStatusStepper: React.FC<{
  status: ApplicationStatusEnum;
  className?: string;
}> = ({ status, className = '' }) => {
  const notSelected = status === 'not_selected';
  const reached = notSelected ? 2 : HAPPY_PATH.indexOf(status);

  return (
    <div className={className}>
      <Stepper
        steps={HAPPY_PATH.map((stage, idx) => ({
          label: humanize(stage),
          tone: idx < reached ? 'done' : idx === reached ? 'active' : 'pending',
        }))}
      />
      {notSelected && (
        <div className="mt-3 flex items-center gap-2">
          <StatPill tone="danger">Not selected</StatPill>
          <span className="text-[11px] text-gray-500">
            Branched off the pipeline after evaluation.
          </span>
        </div>
      )}
    </div>
  );
};
