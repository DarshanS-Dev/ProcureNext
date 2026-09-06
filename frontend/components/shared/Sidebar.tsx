'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/lib/types/api';

interface SidebarProps {
  role: UserRole;
  onNavigateTab?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, onNavigateTab }) => {
  const pathname = usePathname();

  const navItems: Record<UserRole, { label: string; tab: string }[]> = {
    startup: [
      { label: 'OVERVIEW', tab: 'dashboard' },
      { label: 'MY PROFILE', tab: 'startup-profile' },
      { label: 'DISCOVER PS', tab: 'dashboard' },
      { label: 'INVITES', tab: 'dashboard' },
      { label: 'MY APPLICATIONS', tab: 'eligibility' },
    ],
    officer: [
      { label: 'OVERVIEW', tab: 'dashboard' },
      { label: 'PROBLEM STATEMENTS', tab: 'dashboard' },
      { label: 'NEW PS BUILDER', tab: 'decision-readiness' },
      { label: 'APPLICATIONS QUEUE', tab: 'startup-profile' },
    ],
    evaluator: [
      { label: 'OVERVIEW', tab: 'dashboard' },
      { label: 'ASSIGNED PS', tab: 'dashboard' },
      { label: 'SCORE APPLICATION', tab: 'score' },
    ],
    'independent-evaluator': [
      { label: 'OVERVIEW', tab: 'dashboard' },
      { label: 'SANDBOX TRIALS', tab: 'sandbox' },
      { label: 'MILESTONE REVIEWS', tab: 'milestones' },
      { label: 'KPI VERDICTS', tab: 'kpi-verdicts' },
      { label: 'APPLICATION CASEFILE', tab: 'outcome' },
    ],
    admin: [
      { label: 'OVERVIEW', tab: 'dashboard' },
      { label: 'USER MANAGEMENT', tab: 'dashboard' },
      { label: 'STARTUP COMPLIANCE', tab: 'compliance-record' },
      { label: 'EVALUATORS ASSIGN', tab: 'dashboard' },
      { label: 'AUDIT LOG TRAIL', tab: 'audit-trail' },
    ],
  };

  const currentNav = navItems[role] || navItems.startup;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div>
        {/* Emblem & India Govt Branding */}
        <div className="flex items-center gap-3 p-3 mb-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-10 h-10 rounded-full bg-[#8FA888] border border-black flex items-center justify-center font-black text-sm text-white">
            🏛️
          </div>
          <div>
            <div className="text-xs font-black text-black uppercase">Govt of India</div>
            <div className="text-[10px] text-gray-500 font-bold">Procurement Board</div>
          </div>
        </div>

        {/* Interactive Navigation items */}
        <nav className="space-y-1">
          {currentNav.map((item, idx) => {
            return (
              <button
                key={idx}
                onClick={() => onNavigateTab && onNavigateTab(item.tab)}
                className="w-full text-left block px-4 py-3 rounded-lg text-xs font-black tracking-wider uppercase transition-all text-gray-700 hover:bg-[#8FA888] hover:text-white border border-transparent hover:border-black hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-black text-white rounded-xl text-center shadow-md">
        <div className="text-[10px] font-bold uppercase text-[#8FA888]">Process Compliance</div>
        <div className="text-xs font-black uppercase text-white mt-0.5">Visually Verified</div>
      </div>
    </aside>
  );
};
