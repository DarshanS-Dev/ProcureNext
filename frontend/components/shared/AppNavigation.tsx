'use client';

/**
 * Navbar + sidebar for the authenticated shell.
 *
 * Two things changed from the mock version: the role badge reflects the signed-
 * in account (it is no longer a switcher that let anyone pretend to be an
 * admin), and no nav item points at a hardcoded record id. Screens that need an
 * id — score an application, review a contract's milestones — are reached from
 * the list that supplies the id, so the sidebar links to those lists instead.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RoleEnum } from '@/lib/types/api';
import { ROLE_PALETTE } from '@/components/shared/DesignSystem';
import { ROLE_LABELS, Session, signOut } from '@/lib/auth/session';
import {
  BarChart3,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Mail,
  PlusCircle,
  ScrollText,
  Search,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const AppNavbar: React.FC<{ session: Session }> = ({ session }) => {
  const router = useRouter();
  const palette = ROLE_PALETTE[session.roleSlug];

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <header
      className="h-14 bg-white border-b px-6 flex items-center justify-between sticky top-0 z-50"
      style={{ borderColor: '#E8E2D5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <Link href="/" className="flex items-center gap-2.5 group">
        <img
          src="/procurenext-logo.svg"
          alt=""
          className="h-8 w-auto transition-transform group-hover:scale-105"
        />
        <div className="flex flex-col">
          <span className="text-base font-black tracking-tight text-[#1B365D] leading-none">
            procurenext
          </span>
          <span className="text-[9px] text-[#6B6560] font-semibold tracking-wider uppercase mt-0.5">
            Government Procurement Portal
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {/* Identity, read from the token — not selectable. */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{
            backgroundColor: palette.tintBg,
            color: palette.accentText,
            border: `1px solid ${palette.accentBorder}`,
          }}
          title={`Signed in as user #${session.userId}`}
        >
          <span>{palette.icon}</span>
          <span className="hidden sm:block">{ROLE_LABELS[session.role]}</span>
          <span className="font-mono opacity-70">#{session.userId}</span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#6B6560] border border-[#E8E2D5] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

type NavItem = { label: string; href: string; icon: React.ElementType };

const ROLE_NAV: Record<RoleEnum, NavItem[]> = {
  startup: [
    { label: 'Overview', href: '/startup/dashboard', icon: LayoutDashboard },
    { label: 'My Profile', href: '/startup/profile', icon: FileText },
    { label: 'Discover PS', href: '/startup/discover', icon: Search },
    { label: 'My Invites', href: '/startup/invites', icon: Mail },
    { label: 'My Applications', href: '/startup/applications', icon: ClipboardList },
  ],
  officer: [
    { label: 'Overview', href: '/officer/dashboard', icon: LayoutDashboard },
    { label: 'New Problem Statement', href: '/officer/problem-statements/new', icon: PlusCircle },
    { label: 'Problem Statements', href: '/officer/problem-statements', icon: FileText },
    { label: 'Applications Queue', href: '/officer/applications', icon: ClipboardList },
    { label: 'Contracts', href: '/officer/contracts', icon: ScrollText },
  ],
  evaluator: [
    { label: 'Overview', href: '/evaluator/dashboard', icon: LayoutDashboard },
    { label: 'Assigned Work', href: '/evaluator/assigned', icon: FileText },
  ],
  independent_evaluator: [
    { label: 'Overview', href: '/independent-evaluator/dashboard', icon: LayoutDashboard },
    { label: 'Verification Work', href: '/independent-evaluator/applications', icon: FlaskConical },
  ],
  admin: [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'Compliance Queue', href: '/admin/startups/compliance', icon: ShieldCheck },
    { label: 'Evaluator Panels', href: '/admin/evaluators', icon: Scale },
    { label: 'Compliance Records', href: '/admin/applications', icon: ScrollText },
    { label: 'Audit Trail', href: '/admin/audit-log', icon: BarChart3 },
  ],
};

export const AppSidebar: React.FC<{ session: Session }> = ({ session }) => {
  const pathname = usePathname();
  const palette = ROLE_PALETTE[session.roleSlug];
  const navs = ROLE_NAV[session.role];

  return (
    <aside
      className="w-60 min-h-[calc(100vh-3.5rem)] flex flex-col justify-between shrink-0"
      style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E8E2D5' }}
    >
      <div>
        <div
          className="mx-3 mt-4 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ backgroundColor: palette.tintBg, border: `1px solid ${palette.accentBorder}` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: '#fff',
              border: `1px solid ${palette.accentBorder}`,
              color: palette.accentText,
            }}
          >
            {palette.icon}
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#A89F94] uppercase tracking-wider">
              Signed in as
            </div>
            <div className="text-xs font-bold" style={{ color: palette.accentText }}>
              {ROLE_LABELS[session.role]}
            </div>
          </div>
        </div>

        <nav className="px-2.5 space-y-0.5">
          {navs.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  color: isActive ? palette.accentText : '#6B6560',
                  backgroundColor: isActive ? palette.tintBg : 'transparent',
                  borderLeft: isActive
                    ? `3px solid ${palette.accentText}`
                    : '3px solid transparent',
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 mx-3 mb-4">
        <div
          className="px-3 py-2.5 rounded-xl text-center"
          style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}
        >
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#A89F94]">
            Problem Statement
          </div>
          <div className="text-[11px] font-black text-[#1A1A1A] mt-0.5">SIH 26136</div>
        </div>
      </div>
    </aside>
  );
};
