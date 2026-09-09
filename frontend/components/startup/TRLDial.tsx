'use client';

/**
 * TRL stage as a radial dial rather than a dropdown.
 *
 * `trl_stage` is a 1–9 ordinal, and a dial makes the position on that scale
 * legible while you set it — the dashboard already shows the value this way, so
 * the input now mirrors the read-only version instead of hiding it in a select.
 *
 * It is a real form control: arrow keys step it, it exposes slider semantics,
 * and "not set" (null) is reachable, because the column is nullable.
 */

import React from 'react';
import { StatPill } from '@/components/shared/design-system';

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** What each stage means, so the dial teaches the scale rather than assuming it. */
const STAGE_MEANING: Record<number, string> = {
  1: 'Basic principles observed',
  2: 'Technology concept formulated',
  3: 'Experimental proof of concept',
  4: 'Validated in lab',
  5: 'Validated in relevant environment',
  6: 'Demonstrated in relevant environment',
  7: 'Prototype demonstrated operationally',
  8: 'System complete and qualified',
  9: 'Proven in an operational environment',
};

export const TRLDial: React.FC<{
  /** Empty string means "not set". */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
  const current = value ? Number(value) : 0;

  // Three-quarter sweep, opening at the bottom so the label sits in the gap.
  const START = 135;
  const SWEEP = 270;
  const angleFor = (stage: number) => START + ((stage - 1) / (STAGES.length - 1)) * SWEEP;

  const pointOn = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return [50 + Math.cos(rad) * radius, 50 + Math.sin(rad) * radius] as const;
  };

  const step = (delta: number) => {
    if (disabled) return;
    const next = Math.min(9, Math.max(1, (current || 0) + delta));
    onChange(String(next));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange('1');
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange('9');
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onChange('');
    }
  };

  // Arc from stage 1 to the current stage.
  const arcPath = (() => {
    if (!current || current < 2) return null;
    const [x1, y1] = pointOn(START, 36);
    const [x2, y2] = pointOn(angleFor(current), 36);
    const large = angleFor(current) - START > 180 ? 1 : 0;
    return `M ${x1} ${y1} A 36 36 0 ${large} 1 ${x2} ${y2}`;
  })();

  const [trackX1, trackY1] = pointOn(START, 36);
  const [trackX2, trackY2] = pointOn(START + SWEEP, 36);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="TRL stage"
        aria-valuemin={1}
        aria-valuemax={9}
        aria-valuenow={current || undefined}
        aria-valuetext={current ? `TRL ${current} — ${STAGE_MEANING[current]}` : 'Not set'}
        aria-disabled={disabled}
        onKeyDown={handleKey}
        className={`relative shrink-0 rounded-full ${
          disabled ? 'opacity-60' : 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B]'
        }`}
        style={{ width: 168, height: 168 }}
      >
        <svg viewBox="0 0 100 100" width={168} height={168}>
          {/* Track */}
          <path
            d={`M ${trackX1} ${trackY1} A 36 36 0 1 1 ${trackX2} ${trackY2}`}
            fill="none"
            stroke="#F0F0EA"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Filled arc up to the selected stage */}
          {arcPath && (
            <path
              d={arcPath}
              fill="none"
              stroke="#18181B"
              strokeWidth="9"
              strokeLinecap="round"
            />
          )}

          {/* One tappable notch per stage */}
          {STAGES.map((stage) => {
            const [cx, cy] = pointOn(angleFor(stage), 36);
            const active = current === stage;
            const passed = current >= stage;
            return (
              <circle
                key={stage}
                cx={cx}
                cy={cy}
                r={active ? 5.2 : 3}
                fill={active ? '#D7FD44' : passed ? '#18181B' : '#FFFFFF'}
                stroke={passed ? '#18181B' : '#D4D4CE'}
                strokeWidth="1.6"
                className={disabled ? '' : 'cursor-pointer'}
                onClick={() => !disabled && onChange(String(stage))}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-[#18181B] tracking-tight leading-none">
            {current || '—'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
            {current ? 'TRL stage' : 'Not set'}
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-2 text-center sm:text-left">
        <StatPill tone={current ? 'accent' : 'ghost'}>
          {current ? `TRL ${current}` : 'No stage selected'}
        </StatPill>
        <p className="text-xs text-[#18181B] font-semibold leading-snug">
          {current ? STAGE_MEANING[current] : 'Pick a stage on the dial.'}
        </p>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Click a notch, or focus the dial and use the arrow keys. Backspace clears it.
        </p>
        {current > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-bold text-gray-400 hover:text-[#18181B] underline transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
