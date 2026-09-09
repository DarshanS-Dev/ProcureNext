'use client';

/**
 * Pieces shared by the five role dashboards, on the design system.
 *
 * `Stat` deliberately renders an em-dash rather than 0 while a figure is still
 * loading or failed — a dashboard that shows "0 applications" when the request
 * errored is worse than one that shows nothing.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { BigStat, Eyebrow, IconBadge } from '@/components/shared/design-system';
import { UserRole } from '@/lib/types/api';
import { ApiError } from '@/lib/api/client';

export const Stat: React.FC<{
  label: string;
  value: number | string | undefined;
  loading?: boolean;
  error?: ApiError | null;
  hint?: string;
  href?: string;
  icon?: React.ReactNode;
  /** Kept for call-site compatibility; the palette is now role-independent. */
  role?: UserRole;
  /** Renders the one emphasised stat on a dashboard in lime. */
  accent?: boolean;
}> = ({ label, value, loading, error, hint, href, icon, accent = false }) => {
  const body = (
    <div
      className={`rounded-3xl p-5 border shadow-sm h-full flex flex-col justify-between transition-colors ${
        accent
          ? 'bg-[#D7FD44] border-[#C3EB30]'
          : 'bg-white border-[#E5E5E0] ' + (href ? 'hover:border-[#18181B]' : '')
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <IconBadge icon={icon} size="sm" tone={accent ? 'ink' : 'muted'} />}
          <Eyebrow>{label}</Eyebrow>
        </div>
        {href && <ArrowUpRight className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-9 w-16 rounded-full bg-[#F1F1EC] animate-pulse" />
        ) : (
          <BigStat value={error || value === undefined ? '—' : value} />
        )}
        {(hint || error) && (
          <div className="text-[11px] text-gray-500 leading-snug mt-1" title={error?.detail}>
            {error ? 'Unavailable' : hint}
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
};

export const QuickLink: React.FC<{
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  role?: UserRole;
}> = ({ href, title, description, icon }) => (
  <Link href={href} className="block h-full">
    <div className="bg-white rounded-3xl p-5 border border-[#E5E5E0] shadow-xs flex items-start gap-4 hover:border-[#18181B] transition-colors group h-full">
      <IconBadge icon={icon ?? <ArrowUpRight className="w-5 h-5" />} size="lg" className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-sm font-bold text-[#18181B] group-hover:underline">{title}</h5>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#18181B] transition-colors shrink-0" />
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  </Link>
);
