'use client';
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { ApplicationRead, UserRole } from '@/lib/types/api';
import { PipelineStepper } from '@/components/shared/PipelineStepper';
import { StampAnimation, WinkingEnvelope } from '@/components/shared/Metaphors';

interface ApplicationShellProps {
  id: number;
  role: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export const ApplicationShell: React.FC<ApplicationShellProps> = ({
  id, role, activeTab, onTabChange, children
}) => {
  const [app, setApp] = useState<ApplicationRead | null>(null);

  useEffect(() => {
    api.getApplicationById(id, role).then(data => {
      if (data) setApp(data);
    });
  }, [id, role]);

  if (!app) return <div className="p-8 text-center font-bold">Loading application shell...</div>;

  const roleTabs: Record<UserRole, { id: string; label: string }[]> = {
    startup: [
      { id: 'eligibility', label: 'STATUS & ELIGIBILITY' },
      { id: 'checklist', label: 'CHECKLIST' },
      { id: 'sandbox', label: 'SANDBOX' },
      { id: 'contract', label: 'CONTRACT' },
      { id: 'milestones', label: 'MILESTONES' },
      { id: 'kpi-verdicts', label: 'KPI VERDICTS' },
      { id: 'outcome', label: 'OUTCOME' },
    ],
    officer: [
      { id: 'startup-profile', label: 'STARTUP PROFILE' },
      { id: 'eligibility', label: 'ELIGIBILITY' },
      { id: 'checklist', label: 'CHECKLIST' },
      { id: 'coi-status', label: 'COI STATUS' },
      { id: 'scores', label: 'SCORES' },
      { id: 'qcbs', label: 'QCBS SCORE' },
      { id: 'risk-profile', label: 'RISK PROFILE' },
      { id: 'containment-plan', label: 'CONTAINMENT PLAN' },
      { id: 'decision-readiness', label: 'DECISION READINESS' },
      { id: 'outcome', label: 'PILOT OUTCOME' },
    ],
    evaluator: [
      { id: 'score', label: 'RUBRIC SCORING' },
      { id: 'startup-profile', label: 'STARTUP PROFILE' },
      { id: 'coi', label: 'COI DECLARATION' },
    ],
    'independent-evaluator': [
      { id: 'sandbox', label: 'SANDBOX TRIAL' },
      { id: 'milestones', label: 'MILESTONES' },
      { id: 'kpi-verdicts', label: 'KPI VERDICTS' },
      { id: 'outcome', label: 'PILOT OUTCOME' },
    ],
    admin: [
      { id: 'compliance-record', label: 'COMPLIANCE RECORD' },
      { id: 'audit-trail', label: 'AUDIT TRAIL' },
    ]
  };

  const tabs = roleTabs[role] || roleTabs.startup;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black bg-black text-[#8FA888] px-3 py-1 rounded-md uppercase">
              APP #{app.id}
            </span>
            <span className="text-xs font-bold uppercase text-gray-500">Applied: {app.applied_at.substring(0, 10)}</span>
          </div>
          <h1 className="text-2xl font-black text-black uppercase mt-1">{app.proposal_title}</h1>
          <p className="text-xs font-semibold text-gray-600 mt-0.5">{app.technical_proposal_summary}</p>
        </div>

        <div className="flex items-center gap-4">
          <WinkingEnvelope unlocked={!!app.commercial_unlocked_at} />
          <StampAnimation label={app.status.replace('_', ' ')} />
        </div>
      </div>

      {/* Case File Pipeline Stage Stepper */}
      <PipelineStepper currentStatus={app.status} />

      {/* Sub Navigation Bar Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-lg transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-[#8FA888] text-white border-2 border-b-0 border-black shadow-[2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-black'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        {children}
      </div>
    </div>
  );
};
