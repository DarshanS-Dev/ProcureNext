'use client';

/**
 * Data visualisations, extracted from `startup/dashboard` and made data-driven.
 *
 * The originals in `components/startup/StartupCharts.tsx` had their numbers
 * hardcoded. These take real rows and render nothing but what they are given —
 * every one of them has an explicit empty state, because several of these
 * screens genuinely have no data yet in the MVP and inventing some would be
 * worse than showing that.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { seriesColors, tone } from './tokens';

// ── Capsule bar chart ─────────────────────────────────────────

export interface CapsuleBar {
  label: string;
  /** Outer (dark) value, 0..1 of the track. */
  value: number;
  /** Inner (lime) value, 0..1 of the track. Omit for a single-series bar. */
  secondary?: number;
  /** Text for the floating pill above the bar. Omit for none. */
  badge?: string | null;
}

/**
 * The rounded black track with a lime fill rising from the bottom, a dot
 * marker, and a floating % badge — the "Application Activity" chart.
 */
export const CapsuleBarChart: React.FC<{
  bars: CapsuleBar[];
  /** Axis ticks, top to bottom. */
  ticks?: string[];
  emptyLabel?: string;
  className?: string;
}> = ({ bars, ticks = ['1.0', '0.8', '0.6', '0.4', '0.2', '0.0'], emptyLabel, className = '' }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  if (bars.length === 0) {
    return (
      <div className={`h-56 flex items-center justify-center text-xs text-gray-400 ${className}`}>
        {emptyLabel ?? 'No activity in this period yet.'}
      </div>
    );
  }

  return (
    <div className={`relative h-56 pt-2 ${className}`}>
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {ticks.map((val) => (
          <div key={val} className="flex items-center gap-3">
            <span className="w-6 text-right text-gray-400 text-[10px] font-medium">{val}</span>
            <div className="flex-1 border-b border-dashed border-[#ECECE6]" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 pl-9 pr-2 flex items-end justify-between pb-6">
        {bars.map((bar, idx) => {
          const isActive = hovered === idx;
          const outer = Math.max(0, Math.min(1, bar.value));
          const inner = Math.max(0, Math.min(outer, bar.secondary ?? 0));

          return (
            <div
              key={`${bar.label}-${idx}`}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-default"
            >
              {isActive && (
                <motion.div
                  layoutId="capsule-highlight"
                  className="absolute inset-y-0 w-11 border-2 border-dashed border-gray-300 rounded-full bg-gray-50/50 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              {(bar.badge || isActive) && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-7 z-10 bg-[#18181B] text-[#D7FD44] text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap"
                >
                  {bar.badge || `${Math.round(outer * 100)}%`}
                </motion.div>
              )}

              <div className="w-7 h-40 bg-[#F3F3ED] rounded-full p-1 flex flex-col justify-end overflow-hidden relative z-10">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${outer * 100}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.04 }}
                  className="w-full bg-[#18181B] rounded-full relative overflow-hidden flex flex-col justify-end p-0.5"
                >
                  {inner > 0 && outer > 0 && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(inner / outer) * 100}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.04 + 0.1 }}
                      className="w-full bg-[#D7FD44] rounded-full flex items-center justify-center"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#18181B]" />
                    </motion.div>
                  )}
                </motion.div>
              </div>

              <span
                className={`mt-2 text-[11px] font-bold transition-colors ${
                  isActive ? 'text-[#18181B]' : 'text-gray-400'
                }`}
              >
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Donut ring ────────────────────────────────────────────────

export interface DonutSlice {
  label: string;
  count: number;
  color?: string;
}

/** Radial status ring with a big centred total and a legend beneath. */
export const DonutRing: React.FC<{
  slices: DonutSlice[];
  /** Word under the centred total, e.g. "APPLICATIONS". */
  unit?: string;
  emptyLabel?: string;
  className?: string;
}> = ({ slices, unit = 'TOTAL', emptyLabel = 'Nothing to break down yet.', className = '' }) => {
  const rows = slices.filter((s) => s.count > 0);
  const total = rows.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return (
      <div className={`py-10 text-center text-xs text-gray-400 ${className}`}>{emptyLabel}</div>
    );
  }

  let offset = 0;
  const arcs = rows.map((slice, idx) => {
    const pct = (slice.count / total) * 100;
    const arc = { ...slice, pct, dash: pct, offset: -offset, color: slice.color ?? seriesColors[idx % seriesColors.length] };
    offset += pct;
    return arc;
  });

  const path =
    'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

  return (
    <div className={className}>
      <div className="flex items-center justify-center my-3 relative">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
          <path d={path} stroke="#F1F1EC" strokeWidth="4" fill="none" />
          {arcs.map((arc) => (
            <path
              key={arc.label}
              d={path}
              stroke={arc.color}
              strokeWidth="4.5"
              strokeDasharray={`${arc.dash}, 100`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-black text-[#18181B]">{total}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase">{unit}</span>
        </div>
      </div>

      <div className="space-y-1.5 mt-1">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: arc.color }}
              />
              <span className="font-semibold text-gray-700 truncate">{arc.label}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[#18181B] shrink-0">
              <span>{arc.count}</span>
              <span className="text-gray-400 text-[11px]">({Math.round(arc.pct)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Radar ─────────────────────────────────────────────────────

export interface RadarAxis {
  label: string;
  /** 0..1. */
  value: number;
}

/**
 * N-axis polygon chart. Used for TRL readiness (5 axes) and for the 7-criterion
 * rubric on the officer's evaluation summary.
 */
export const RadarChart: React.FC<{
  axes: RadarAxis[];
  /** Label shown at the centre of the shape. */
  centerLabel?: string;
  size?: number;
  className?: string;
}> = ({ axes, centerLabel, size = 200, className = '' }) => {
  if (axes.length < 3) {
    return (
      <div className={`py-10 text-center text-xs text-gray-400 ${className}`}>
        Not enough dimensions scored yet.
      </div>
    );
  }

  const cx = 50;
  const cy = 52;
  const r = 34;
  const step = (Math.PI * 2) / axes.length;

  const pointAt = (idx: number, ratio: number) => {
    const angle = idx * step - Math.PI / 2;
    return [cx + Math.cos(angle) * r * ratio, cy + Math.sin(angle) * r * ratio] as const;
  };

  const ringPoints = (ratio: number) =>
    axes
      .map((_, i) => pointAt(i, ratio))
      .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ');

  const valuePoints = axes
    .map((axis, i) => pointAt(i, Math.max(0.04, Math.min(1, axis.value))))
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ height: size }}>
      <svg viewBox="0 0 100 104" style={{ width: size, height: size }}>
        {[1, 0.66, 0.33].map((ratio) => (
          <polygon
            key={ratio}
            points={ringPoints(ratio)}
            fill="none"
            stroke={ratio === 1 ? '#E4E4DC' : '#F0F0EA'}
            strokeWidth="1"
          />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pointAt(i, 1);
          return (
            <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#F0F0EA" strokeWidth="0.6" />
          );
        })}

        <polygon
          points={valuePoints}
          fill="rgba(215, 253, 68, 0.45)"
          stroke={tone.ink}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {axes.map((axis, i) => {
          const [x, y] = pointAt(i, Math.max(0.04, Math.min(1, axis.value)));
          return <circle key={axis.label} cx={x} cy={y} r="2.6" fill={tone.ink} />;
        })}

        {axes.map((axis, i) => {
          const [x, y] = pointAt(i, 1.28);
          return (
            <text
              key={`${axis.label}-label`}
              x={x}
              y={y}
              textAnchor={x > cx + 2 ? 'start' : x < cx - 2 ? 'end' : 'middle'}
              dominantBaseline="middle"
              fontSize="4.6"
              fontWeight="700"
              fill="#6B7280"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>

      {centerLabel && (
        <span className="absolute top-0 text-[10px] font-bold text-[#18181B] bg-[#F3F3EE] px-1.5 rounded">
          {centerLabel}
        </span>
      )}
    </div>
  );
};

// ── Segmented progress capsule ────────────────────────────────

/**
 * The dashed-to-solid segmented bar from the dashboard's "My Applications"
 * card. Reused as the registration / form-completion progress indicator.
 */
export const ProgressCapsule: React.FC<{
  /** How many segments are filled. */
  filled: number;
  total: number;
  /** Filled colour — ink on light cards, ink on lime cards too. */
  onAccent?: boolean;
  /** Per-segment labels shown beneath, when the segments are named steps. */
  labels?: string[];
  className?: string;
}> = ({ filled, total, onAccent = false, labels, className = '' }) => (
  <div className={className}>
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, idx) => (
        <div
          key={idx}
          className={`h-7 flex-1 rounded-full transition-all duration-300 ${
            idx < filled
              ? 'bg-[#18181B]'
              : onAccent
                ? 'border-2 border-dashed border-[#B6DB2D] bg-white/30'
                : 'border-2 border-dashed border-[#D4D4CE] bg-[#FAFAFA]'
          }`}
        />
      ))}
    </div>
    {labels && (
      <div className="flex items-center gap-1.5 mt-1.5">
        {labels.map((label, idx) => (
          <span
            key={label}
            className={`flex-1 text-center text-[10px] font-bold truncate ${
              idx < filled ? 'text-[#18181B]' : 'text-gray-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    )}
  </div>
);

// ── Vertical capsule gauge ────────────────────────────────────

/**
 * The capsule bar stood on end, used one-per-risk-category. `level` drives the
 * colour; there is no numeric risk score in the schema, so the fill is the
 * level's band, not an invented number.
 */
export const CapsuleGauge: React.FC<{
  label: string;
  level: 'low' | 'medium' | 'high' | null;
  /** Small caption under the label, e.g. the stage this reading came from. */
  caption?: string;
  className?: string;
}> = ({ label, level, caption, className = '' }) => {
  const fill = level === 'high' ? 0.95 : level === 'medium' ? 0.6 : level === 'low' ? 0.28 : 0;
  const color =
    level === 'high' ? tone.danger : level === 'medium' ? tone.warn : level === 'low' ? tone.ok : '#E5E5E0';

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="w-7 h-28 bg-[#F3F3ED] rounded-full p-1 flex flex-col justify-end overflow-hidden">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${fill * 100}%` }}
          transition={{ duration: 0.45 }}
          className="w-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold text-[#18181B] leading-tight">{label}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {level ?? 'n/a'}
        </div>
        {caption && <div className="text-[9px] text-gray-400">{caption}</div>}
      </div>
    </div>
  );
};

// ── Dot track ─────────────────────────────────────────────────

/**
 * The "tumbler" progress track: one dot per gate, grey while locked, lime once
 * satisfied. Used for decision readiness (6 checks) and eligibility sub-checks.
 */
export const DotTrack: React.FC<{
  dots: { label: string; done: boolean }[];
  className?: string;
}> = ({ dots, className = '' }) => (
  <div className={`flex items-stretch gap-2 ${className}`}>
    {dots.map((dot, idx) => (
      <div key={dot.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
        <div className="w-full flex items-center gap-1.5">
          <span
            className={`w-4 h-4 rounded-full shrink-0 border-2 ${
              dot.done ? 'bg-[#D7FD44] border-[#18181B]' : 'bg-white border-[#D4D4CE]'
            }`}
          />
          {idx < dots.length - 1 && (
            <span
              className={`flex-1 h-0.5 rounded-full ${dot.done ? 'bg-[#18181B]' : 'bg-[#E5E5E0]'}`}
            />
          )}
        </div>
        <span
          className={`text-[10px] font-bold leading-tight text-center w-full ${
            dot.done ? 'text-[#18181B]' : 'text-gray-400'
          }`}
        >
          {dot.label}
        </span>
      </div>
    ))}
  </div>
);

// ── Horizontal stepper ────────────────────────────────────────

export interface StepNode {
  label: string;
  /** Free-text state shown as a pill under the node. */
  state?: string;
  tone?: 'done' | 'active' | 'pending' | 'failed';
  /** Optional second pill, e.g. milestone payment status. */
  meta?: string;
}

/** The 5-node milestone stepper, also used for application status. */
export const Stepper: React.FC<{ steps: StepNode[]; className?: string }> = ({
  steps,
  className = '',
}) => (
  <div className={`flex items-start gap-1 overflow-x-auto pb-1 ${className}`}>
    {steps.map((step, idx) => {
      const nodeTone = step.tone ?? 'pending';
      const dotClass =
        nodeTone === 'done'
          ? 'bg-[#D7FD44] border-[#18181B]'
          : nodeTone === 'active'
            ? 'bg-[#18181B] border-[#18181B]'
            : nodeTone === 'failed'
              ? 'bg-[#FBEAEC] border-[#C81E4A]'
              : 'bg-white border-[#D4D4CE]';

      return (
        <div key={step.label} className="flex-1 min-w-[92px] flex flex-col items-center gap-2">
          <div className="w-full flex items-center">
            <span className={`w-5 h-5 rounded-full border-2 shrink-0 ${dotClass}`} />
            {idx < steps.length - 1 && (
              <span
                className={`flex-1 h-0.5 ${
                  nodeTone === 'done' ? 'bg-[#18181B]' : 'bg-[#E5E5E0]'
                }`}
              />
            )}
          </div>
          <div className="text-center px-1 w-full">
            <div
              className={`text-[10px] font-bold leading-tight ${
                nodeTone === 'pending' ? 'text-gray-400' : 'text-[#18181B]'
              }`}
            >
              {step.label}
            </div>
            {step.state && (
              <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 mt-0.5">
                {step.state}
              </div>
            )}
            {step.meta && (
              <div className="inline-flex mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F3F3EE] text-[#6B7280]">
                {step.meta}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);
