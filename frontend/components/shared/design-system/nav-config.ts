/**
 * Top-nav contents per role — the one place to edit when a route moves.
 *
 * These are the same route trees the sidebar used; nothing new was added and
 * nothing was renamed. Each role also declares the single primary action that
 * sits in the top-right CTA pill.
 */

import type { RoleEnum } from '@/lib/types/api';

export interface NavItem {
  label: string;
  href: string;
  /** Extra path prefixes that should also light this item up. */
  matches?: string[];
}

export interface RoleNav {
  items: NavItem[];
  cta: { label: string; href: string };
}

export const ROLE_NAV: Record<RoleEnum, RoleNav> = {
  startup: {
    items: [
      { label: 'Overview', href: '/startup/dashboard' },
      { label: 'Applications', href: '/startup/applications' },
      { label: 'Problem Statements', href: '/startup/discover' },
      { label: 'Invites', href: '/startup/invites' },
      { label: 'TRL Profile', href: '/startup/profile' },
    ],
    cta: { label: 'Explore Opportunities', href: '/startup/discover' },
  },
  officer: {
    items: [
      { label: 'Overview', href: '/officer/dashboard' },
      { label: 'Problem Statements', href: '/officer/problem-statements' },
      { label: 'Applications', href: '/officer/applications' },
      { label: 'Contracts', href: '/officer/contracts' },
    ],
    cta: { label: 'New Problem Statement', href: '/officer/problem-statements/new' },
  },
  evaluator: {
    items: [
      { label: 'Overview', href: '/evaluator/dashboard' },
      { label: 'Assigned Work', href: '/evaluator/assigned' },
      { label: 'Scoring', href: '/evaluator/applications' },
    ],
    cta: { label: 'My Assignments', href: '/evaluator/assigned' },
  },
  independent_evaluator: {
    items: [
      { label: 'Overview', href: '/independent-evaluator/dashboard' },
      { label: 'Verification Work', href: '/independent-evaluator/applications' },
    ],
    cta: { label: 'Pending Reviews', href: '/independent-evaluator/applications' },
  },
  admin: {
    items: [
      { label: 'Overview', href: '/admin/dashboard' },
      { label: 'Users', href: '/admin/users' },
      { label: 'Compliance', href: '/admin/startups/compliance' },
      { label: 'Evaluators', href: '/admin/evaluators' },
      { label: 'Records', href: '/admin/applications' },
      { label: 'Audit Log', href: '/admin/audit-log' },
    ],
    cta: { label: 'Compliance Queue', href: '/admin/startups/compliance' },
  },
};

/** Longest-prefix match, so `/officer/problem-statements/new` lights the PS item. */
export function activeHref(pathname: string | null, items: NavItem[]): string | null {
  if (!pathname) return null;
  let best: NavItem | null = null;
  for (const item of items) {
    const candidates = [item.href, ...(item.matches ?? [])];
    const hit = candidates.some(
      (href) => pathname === href || pathname.startsWith(`${href}/`),
    );
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.href ?? null;
}
