'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/lib/types/api';
import { ROLE_PALETTE } from '@/components/shared/DesignSystem';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  CheckCircle,
  Award,
  FlaskConical,
  ShieldAlert,
  ClipboardList,
  Sparkles,
  Search,
  Mail,
  ShieldCheck,
  BarChart3,
  ChevronDown,
  LogOut,
} from 'lucide-react';

interface AppNavigationProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activePath?: string;
}

export const AppNavbar: React.FC<AppNavigationProps> = ({ currentRole, onRoleChange }) => {
  const palette = ROLE_PALETTE[currentRole];
  const [roleDropOpen, setRoleDropOpen] = useState(false);

  const ALL_ROLES: UserRole[] = ['startup', 'officer', 'evaluator', 'independent-evaluator', 'admin'];

  return (
    <header
      className="h-14 bg-white border-b px-6 flex items-center justify-between sticky top-0 z-50"
      style={{ borderColor: '#E8E2D5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <img
          src="/procurenext-logo.svg"
          alt="ProcureNext Logo"
          className="h-8 w-auto transition-transform group-hover:scale-105"
        />
        <div className="flex flex-col">
          <span className="text-base font-black tracking-tight text-[#1B365D] leading-none">
            procure<span className="text-[#1B365D]">next</span>
          </span>
          <span className="text-[9px] text-[#6B6560] font-semibold tracking-wider uppercase mt-0.5">
            Government Procurement Portal
          </span>
        </div>
      </Link>

      {/* Center: cycle badge */}
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-bold tracking-wide"
        style={{
          backgroundColor: palette.tintBg,
          color: palette.accentText,
          border: `1px solid ${palette.accentBorder}`,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.accentText }} />
        CYCLE 2024 Q3 · Jul–Sep
      </div>

      {/* Right: role switcher + auth */}
      <div className="flex items-center gap-3 relative">
        {/* Role switcher *            <div className="relative">
          <button
            onClick={() => setRoleDropOpen(!roleDropOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            style={{
              backgroundColor: palette.tintBg,
              color: palette.accentText,
              border: `1px solid ${palette.accentBorder}`,
            }}
          >
            <span>{palette.icon}</span>
            <span className="hidden sm:block">{palette.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {roleDropOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl py-1.5 z-50 overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E2D5', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            >
              {ALL_ROLES.map((r) => {
                const p = ROLE_PALETTE[r];
                return (
                  <button
                    key={r}
                    onClick={() => { onRoleChange(r); setRoleDropOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-left transition-colors cursor-pointer hover:bg-[#F8F6F1] ${r === currentRole ? 'bg-[#F8F6F1]' : ''}`}
                    style={{ color: r === currentRole ? p.accentText : '#6B6560' }}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                    {r === currentRole && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.accentText }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Auth link */}
        <Link
          href="/login"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#6B6560] border border-[#E8E2D5] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Sign Out</span>
        </Link>
      </div>
    </header>
  );
};

export const AppSidebar: React.FC<{ role: UserRole }> = ({ role }) => {
  const pathname = usePathname();
  const palette = ROLE_PALETTE[role];

  const roleNavs: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
    startup: [
      { label: 'Overview', href: '/startup/dashboard', icon: LayoutDashboard },
      { label: 'My Profile', href: '/startup/profile', icon: FileText },
      { label: 'Discover PS', href: '/startup/discover', icon: Search },
      { label: 'Invites Feed', href: '/startup/invites', icon: Mail },
      { label: 'My Applications', href: '/startup/applications', icon: ClipboardList },
    ],
    officer: [
      { label: 'Overview', href: '/officer/dashboard', icon: LayoutDashboard },
      { label: 'New PS Builder', href: '/officer/problem-statements/new', icon: PlusCircle },
      { label: 'Problem Statements', href: '/officer/problem-statements', icon: FileText },
      { label: 'Applications Queue', href: '/officer/applications', icon: ClipboardList },
    ],
    evaluator: [
      { label: 'Overview', href: '/evaluator/dashboard', icon: LayoutDashboard },
      { label: 'Assigned PS', href: '/evaluator/assigned', icon: FileText },
      { label: 'Score Application', href: '/evaluator/applications/1/score', icon: Award },
    ],
    'independent-evaluator': [
      { label: 'Overview', href: '/independent-evaluator/dashboard', icon: LayoutDashboard },
      { label: 'Sandbox Trials', href: '/independent-evaluator/applications/1/sandbox', icon: FlaskConical },
      { label: 'Milestone Reviews', href: '/independent-evaluator/contracts/1/milestones', icon: CheckCircle },
      { label: 'KPI Verdicts', href: '/independent-evaluator/contracts/1/kpi-verdicts', icon: BarChart3 },
    ],
    admin: [
      { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'User Management', href: '/admin/users', icon: Users },
      { label: 'Compliance Queue', href: '/admin/startups/compliance', icon: ShieldCheck },
      { label: 'Compliance Record', href: '/admin/applications/1/compliance-record', icon: ShieldAlert },
      { label: 'Audit Log Trail', href: '/admin/audit-log', icon: Sparkles },
    ],
  };

  const navs = roleNavs[role] ?? roleNavs.startup;

  return (
    <aside
      className="w-60 min-h-[calc(100vh-3.5rem)] flex flex-col justify-between"
      style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E8E2D5' }}
    >
      {/* Role identity card */}
      <div>
        <div
          className="mx-3 mt-4 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ backgroundColor: palette.tintBg, border: `1px solid ${palette.accentBorder}` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#fff', border: `1px solid ${palette.accentBorder}`, color: palette.accentText }}
          >
            {palette.icon}
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#A89F94] uppercase tracking-wider">Signed in as</div>
            <div className="text-xs font-bold" style={{ color: palette.accentText }}>{palette.label}</div>
          </div>
        </div>

        <nav className="px-2.5 space-y-0.5">
          {navs.map((item, idx) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={idx}
                href={item.href}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  color: isActive ? palette.accentText : '#6B6560',
                  backgroundColor: isActive ? palette.tintBg : 'transparent',
                  borderLeft: isActive ? `3px solid ${palette.accentText}` : '3px solid transparent',
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer compliance badge */}
      <div className="p-3 mx-3 mb-4">
        <div
          className="px-3 py-2.5 rounded-xl text-center"
          style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}
        >
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#A89F94]">PRD Verified</div>
          <div className="text-[11px] font-black text-[#1A1A1A] mt-0.5">PS 26136 Compliant</div>
        </div>
      </div>
    </aside>
  );
};
