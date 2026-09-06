'use client';

/**
 * Pieces shared by the five role dashboards.
 *
 * `Stat` deliberately renders an em-dash rather than 0 while a figure is still
 * loading or failed — a dashboard that shows "0 applications" when the request
 * errored is worse than one that shows nothing.
 */

import React from 'react';
import Link from 'next/link';
import { DataCard } from '@/components/shared/DesignSystem';
import { ROLE_PALETTE } from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { ApiError } from '@/lib/api/client';

export const Stat: React.FC<{
  label: string;
  value: number | string | undefined;
  loading?: boolean;
  error?: ApiError | null;
  hint?: string;
  href?: string;
  role: UserRole;
}> = ({ label, value, loading, error, hint, href, role }) => {
  const palette = ROLE_PALETTE[role];

  const body = (
    <DataCard hover={Boolean(href)} className="h-full">
      <div className="space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#A89F94]">
          {label}
        </div>
        {loading ? (
          <div className="h-8 w-16 rounded bg-[#F1EDE4] animate-pulse" />
        ) : (
          <div
            className="text-3xl font-black tabular-nums"
            style={{ color: error ? '#A89F94' : palette.accentText }}
            title={error ? error.detail : undefined}
          >
            {error || value === undefined ? '—' : value}
          </div>
        )}
        {(hint || error) && (
          <div className="text-[11px] text-[#6B6560] leading-snug">
            {error ? 'Unavailable' : hint}
          </div>
        )}
      </div>
    </DataCard>
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
  role: UserRole;
}> = ({ href, title, description, role }) => {
  const palette = ROLE_PALETTE[role];
  return (
    <Link href={href} className="block">
      <DataCard hover>
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: palette.tintBg,
              border: `1px solid ${palette.accentBorder}`,
              color: palette.accentText,
            }}
          >
            {palette.icon}
          </div>
          <div>
            <div className="text-xs font-bold text-[#1A1A1A]">{title}</div>
            <p className="text-[11px] text-[#6B6560] leading-relaxed mt-0.5">{description}</p>
          </div>
        </div>
      </DataCard>
    </Link>
  );
};
