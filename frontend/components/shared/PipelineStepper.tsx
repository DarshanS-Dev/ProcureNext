'use client';
import React from 'react';
import { ApplicationStatus } from '@/lib/types/api';
import { Check } from 'lucide-react';

interface PipelineStepperProps {
  currentStatus: ApplicationStatus;
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ currentStatus }) => {
  const stages: { key: ApplicationStatus; label: string; count?: number }[] = [
    { key: 'applied', label: 'APPLIED', count: 245 },
    { key: 'under_review', label: 'ELIGIBLE', count: 180 },
    { key: 'under_evaluation', label: 'SCOPED', count: 75 },
    { key: 'selected', label: 'COMMERCIAL REVIEW', count: 40 },
    { key: 'contracted', label: 'SELECTED', count: 25 },
    { key: 'completed', label: 'CONTRACTED', count: 14 },
  ];

  const getStatusIndex = (status: ApplicationStatus) => {
    switch (status) {
      case 'applied': return 0;
      case 'under_review': return 1;
      case 'under_evaluation': return 2;
      case 'selected': return 3;
      case 'contracted': return 4;
      case 'completed': return 5;
      default: return 0;
    }
  };

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <div
      className="w-full bg-white p-5 rounded-xl border border-[#E8E2D5] mb-6 overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="text-[11px] font-bold uppercase text-[#6B6560] tracking-wider mb-3 flex items-center justify-between">
        <span>Application Lifecycle Pipeline</span>
        <span className="font-mono text-[10px] text-[#A89F94]">Stage {currentIndex + 1} of 6</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        {stages.map((stage, idx) => {
          const isPassed = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={stage.key}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                isCurrent
                  ? 'bg-[#1E9E5A] text-white border-[#1E9E5A] shadow-sm'
                  : isPassed
                  ? 'bg-[#EAF7ED] text-[#1E9E5A] border-[#B8E6C4]'
                  : 'bg-[#F8F6F1] text-[#A89F94] border-[#E8E2D5]'
              }`}
            >
              <div className="flex items-center gap-1">
                {isPassed && !isCurrent && <Check className="w-3 h-3 text-[#1E9E5A]" />}
                <span className="text-sm font-bold tracking-tight">
                  {stage.count || (idx + 1) * 10}
                </span>
              </div>
              <div
                className={`text-[9px] font-bold uppercase tracking-wider text-center mt-1 truncate max-w-full ${
                  isCurrent ? 'text-white' : isPassed ? 'text-[#1E9E5A]' : 'text-[#A89F94]'
                }`}
              >
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
