'use client';

/**
 * Where one application sits in the ApplicationStatusEnum lifecycle.
 *
 * The stage labels are the enum values themselves. The previous version showed
 * invented counts ("245", "180") next to labels that did not line up with the
 * status they were keyed to, which read as real data.
 */

import React from 'react';
import { ApplicationStatusEnum } from '@/lib/types/api';
import { Check, X } from 'lucide-react';

/** The happy path. `not_selected` is terminal and rendered separately. */
const STAGES: { key: ApplicationStatusEnum; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under review' },
  { key: 'under_evaluation', label: 'Under evaluation' },
  { key: 'selected', label: 'Selected' },
  { key: 'contracted', label: 'Contracted' },
  { key: 'completed', label: 'Completed' },
];

export const PipelineStepper: React.FC<{ currentStatus: ApplicationStatusEnum }> = ({
  currentStatus,
}) => {
  const notSelected = currentStatus === 'not_selected';
  const currentIndex = notSelected
    ? -1
    : STAGES.findIndex((s) => s.key === currentStatus);

  return (
    <div
      className="w-full bg-white p-5 rounded-xl border border-[#E8E2D5] overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="text-[11px] font-bold uppercase text-[#6B6560] tracking-wider mb-3 flex items-center justify-between">
        <span>Application lifecycle</span>
        <span className="font-mono text-[10px] text-[#A89F94]">
          {notSelected ? 'Closed — not selected' : `Stage ${currentIndex + 1} of ${STAGES.length}`}
        </span>
      </div>

      {notSelected ? (
        <div
          className="p-3.5 rounded-lg flex items-center gap-2.5"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <X className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span className="text-xs font-bold text-[#DC2626]">
            Not selected — another application was chosen for this problem statement.
          </span>
        </div>
      ) : (
        <ol className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          {STAGES.map((stage, idx) => {
            const isPassed = idx <= currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <li
                key={stage.key}
                aria-current={isCurrent ? 'step' : undefined}
                className="p-3 rounded-lg border flex flex-col items-center justify-center text-center transition-all"
                style={
                  isCurrent
                    ? { backgroundColor: '#1E9E5A', color: '#fff', borderColor: '#1E9E5A' }
                    : isPassed
                      ? { backgroundColor: '#EAF7ED', color: '#1E9E5A', borderColor: '#B8E6C4' }
                      : { backgroundColor: '#F8F6F1', color: '#A89F94', borderColor: '#E8E2D5' }
                }
              >
                <div className="flex items-center justify-center h-4">
                  {isPassed && !isCurrent ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-xs font-black">{idx + 1}</span>
                  )}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider mt-1">
                  {stage.label}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
