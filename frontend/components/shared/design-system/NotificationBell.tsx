'use client';

/**
 * Notifications, derived client-side.
 *
 * There is no Notification table and no audit-log read endpoint in the locked
 * schema, so nothing here is pushed — the feed is assembled from rows the
 * signed-in role can already fetch, and the panel says so. Anything that would
 * imply a real notification backend (unread counts persisted server-side, mark
 * as read, push) is deliberately absent.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { api, orNull } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { Session } from '@/lib/auth/session';
import { IconBadge } from './primitives';

export interface DerivedNotice {
  id: string;
  title: string;
  detail: string;
  href: string;
  at?: string | null;
}

const fmt = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
};

/**
 * Per-role derivation. Each branch only calls endpoints that role is already
 * allowed to hit, so opening the bell never 403s.
 */
function useDerivedNotices(session: Session): DerivedNotice[] {
  const isStartup = session.role === 'startup';
  const isOfficer = session.role === 'officer';

  const apps = useQuery(
    () => orNull(api.getApplicationsForStartup(session.userId)),
    [session.userId, isStartup],
    { enabled: isStartup },
  );
  const invites = useQuery(() => orNull(api.getMyInvites()), [isStartup], {
    enabled: isStartup,
  });
  const statements = useQuery(() => orNull(api.getProblemStatements()), [isOfficer], {
    enabled: isOfficer,
  });

  return useMemo(() => {
    const out: DerivedNotice[] = [];

    for (const app of apps.data ?? []) {
      out.push({
        id: `app-${app.id}`,
        title: `Application #${app.id}`,
        detail: `Status: ${app.status.replace(/_/g, ' ')}`,
        href: `/startup/applications/${app.id}`,
        at: app.created_at,
      });
    }

    for (const invite of invites.data ?? []) {
      out.push({
        id: `invite-${invite.id}`,
        title: 'Invite to apply',
        detail: `Problem statement #${invite.problem_statement_id}`,
        href: '/startup/invites',
        at: invite.invited_at,
      });
    }

    for (const ps of statements.data ?? []) {
      if (ps.officer_id !== session.userId) continue;
      out.push({
        id: `ps-${ps.id}`,
        title: ps.title,
        detail: ps.status === 'draft' ? 'Draft — not published yet' : `Status: ${ps.status}`,
        href: `/officer/problem-statements/${ps.id}`,
        at: ps.published_at ?? ps.created_at,
      });
    }

    return out
      .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
      .slice(0, 8);
  }, [apps.data, invites.data, statements.data, session.userId]);
}

export const NotificationBell: React.FC<{ session: Session }> = ({ session }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notices = useDerivedNotices(session);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Recent activity"
        className="w-9 h-9 rounded-full bg-white border border-[#E5E5E0] text-[#6B7280] hover:text-[#18181B] hover:border-[#18181B] flex items-center justify-center transition-colors cursor-pointer relative"
      >
        <Bell className="w-4 h-4" />
        {notices.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#D7FD44] border border-[#18181B] text-[9px] font-black text-[#18181B] flex items-center justify-center">
            {notices.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl border border-[#E5E5E0] shadow-lg p-3 z-50">
          <div className="px-2 pb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#18181B]">
              Recent activity
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1">
            {notices.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-gray-400">
                Nothing to show yet.
              </div>
            ) : (
              notices.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-2 py-2.5 rounded-2xl hover:bg-[#F4F4EF] transition-colors"
                >
                  <IconBadge icon={<Bell className="w-3.5 h-3.5" />} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#18181B] truncate">{n.title}</div>
                    <div className="text-[11px] text-gray-500 truncate">{n.detail}</div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{fmt(n.at)}</span>
                </Link>
              ))
            )}
          </div>

          <p className="px-2 pt-2 mt-1 border-t border-[#F0F0EA] text-[10px] text-gray-400 leading-relaxed">
            Derived from your own records — the MVP has no notification store.
          </p>
        </div>
      )}
    </div>
  );
};
