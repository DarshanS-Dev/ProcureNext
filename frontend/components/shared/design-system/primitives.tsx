'use client';

/**
 * The card anatomy from `startup/dashboard`, as reusable parts.
 *
 * Every card in the redesign is the same four things: a circular icon badge, an
 * uppercase eyebrow, one big data point, and a footer action with an arrow.
 * These components are that shape — pages compose them rather than restyling a
 * div each time. Colours come from ./tokens; nothing here hardcodes a new one.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, FileX2, RefreshCw } from 'lucide-react';

// ── Icon badge ────────────────────────────────────────────────

type BadgeTone = 'muted' | 'ink' | 'accent' | 'onDark' | 'ok' | 'warn' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
  muted: 'bg-[#F3F3EE] text-[#18181B]',
  ink: 'bg-[#18181B] text-white',
  accent: 'bg-[#D7FD44] text-[#18181B]',
  onDark: 'bg-white/10 text-[#D7FD44]',
  ok: 'bg-[#EAF7ED] text-[#1E9E5A]',
  warn: 'bg-[#FEF6E7] text-[#B45309]',
  danger: 'bg-[#FBEAEC] text-[#C81E4A]',
};

const BADGE_SIZES = { sm: 'w-8 h-8', md: 'w-9 h-9', lg: 'w-11 h-11' } as const;

export const IconBadge: React.FC<{
  icon: React.ReactNode;
  tone?: BadgeTone;
  size?: keyof typeof BADGE_SIZES;
  className?: string;
}> = ({ icon, tone = 'muted', size = 'md', className = '' }) => (
  <span
    className={`${BADGE_SIZES[size]} ${BADGE_TONES[tone]} rounded-full flex items-center justify-center shrink-0 ${className}`}
  >
    {icon}
  </span>
);

// ── Stat pill ─────────────────────────────────────────────────

type PillTone = 'ink' | 'accent' | 'white' | 'ok' | 'warn' | 'danger' | 'ghost' | 'info';

const PILL_TONES: Record<PillTone, string> = {
  ink: 'bg-[#18181B] text-white',
  accent: 'bg-[#D7FD44] text-[#18181B]',
  white: 'bg-white text-[#18181B]',
  ok: 'bg-[#EAF7ED] text-[#1E9E5A]',
  warn: 'bg-amber-400 text-black',
  danger: 'bg-[#FBEAEC] text-[#C81E4A]',
  info: 'bg-[#E9F1FB] text-[#2563EB]',
  ghost: 'bg-[#F3F3EE] text-[#6B7280]',
};

/** The black rounded percentage/label pill (`90%`, `TRL 7`, `Action Needed`). */
export const StatPill: React.FC<{
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
}> = ({ children, tone = 'ink', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap ${PILL_TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

/** Uppercase small label that sits beside the icon badge. */
export const Eyebrow: React.FC<{ children: React.ReactNode; onDark?: boolean }> = ({
  children,
  onDark = false,
}) => (
  <span
    className={`text-xs font-bold uppercase tracking-wider ${
      onDark ? 'text-gray-300' : 'text-[#18181B]'
    }`}
  >
    {children}
  </span>
);

/** The one big number a card exists to show. */
export const BigStat: React.FC<{
  value: React.ReactNode;
  unit?: string;
  onDark?: boolean;
}> = ({ value, unit, onDark = false }) => (
  <div className="flex items-baseline gap-2">
    <span
      className={`text-4xl font-black tracking-tight ${onDark ? 'text-white' : 'text-[#18181B]'}`}
    >
      {value}
    </span>
    {unit && <span className="text-xs font-medium text-gray-400">{unit}</span>}
  </div>
);

// ── Card ──────────────────────────────────────────────────────

export interface CardProps {
  /** Circular badge glyph, top-left. */
  icon?: React.ReactNode;
  /** Uppercase eyebrow beside the badge. */
  label?: React.ReactNode;
  /** Right-hand slot on the header row — usually a StatPill. */
  aside?: React.ReactNode;
  /** Footer action row, rendered above a hairline divider. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** Lift on hover — only for cards that are themselves clickable. */
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  icon,
  label,
  aside,
  footer,
  children,
  className = '',
  interactive = false,
}) => (
  <motion.div
    whileHover={interactive ? { y: -2 } : undefined}
    className={`bg-white rounded-3xl p-6 border border-[#E5E5E0] shadow-sm flex flex-col ${
      interactive ? 'hover:border-[#18181B] transition-colors' : ''
    } ${className}`}
  >
    {(icon || label || aside) && (
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <IconBadge icon={icon} size="sm" />}
          {label && <Eyebrow>{label}</Eyebrow>}
        </div>
        {aside}
      </div>
    )}
    <div className="flex-1 min-w-0">{children}</div>
    {footer && (
      <div className="text-xs font-semibold text-gray-500 flex items-center justify-between gap-3 border-t border-[#F0F0EA] pt-3 mt-4">
        {footer}
      </div>
    )}
  </motion.div>
);

/**
 * The reserved-emphasis card. At most one per page: black while the thing it
 * tracks still needs attention, flipping to lime once it is resolved.
 */
export const HeroCard: React.FC<{
  icon?: React.ReactNode;
  label?: React.ReactNode;
  aside?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** Either a link spec, or any node to render in the action slot. */
  action?: { label: string; href: string } | React.ReactNode;
  /** `ink` = still needs attention, `ready` = resolved (lime). */
  state?: 'ink' | 'ready';
  className?: string;
}> = ({ icon, label, aside, title, body, action, state = 'ink', className = '' }) => {
  const dark = state === 'ink';
  const isLinkSpec =
    action !== null &&
    typeof action === 'object' &&
    !React.isValidElement(action) &&
    'href' in (action as Record<string, unknown>);

  return (
    <motion.div
      layout
      className={`rounded-3xl p-6 flex flex-col justify-between shadow-md ${
        dark ? 'bg-[#121212] text-white' : 'bg-[#D7FD44] text-[#18181B] border border-[#C3EB30]'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <IconBadge icon={icon} size="sm" tone={dark ? 'onDark' : 'ink'} />}
          {label && <Eyebrow onDark={dark}>{label}</Eyebrow>}
        </div>
        {aside}
      </div>

      <div className="my-3 space-y-1">
        <h3 className="text-lg font-black tracking-tight">{title}</h3>
        {body && (
          <p className={`text-xs leading-relaxed ${dark ? 'text-gray-400' : 'text-[#18181B]/70'}`}>
            {body}
          </p>
        )}
      </div>

      {action ? (
        <div className="pt-2">
          {isLinkSpec ? (
            <Link href={(action as { href: string }).href}>
              <button
                className={`w-full font-bold text-xs py-2.5 px-4 rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  dark
                    ? 'bg-white hover:bg-[#D7FD44] text-[#121212]'
                    : 'bg-[#18181B] hover:bg-black text-white'
                }`}
              >
                <span>{(action as { label: string }).label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          ) : (
            (action as React.ReactNode)
          )}
        </div>
      ) : null}
    </motion.div>
  );
};

/** The footer link shape used across cards: `Track →`. */
export const CardLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children,
}) => (
  <Link href={href} className="text-[#18181B] font-bold hover:underline flex items-center gap-1">
    {children} <ArrowRight className="w-3 h-3" />
  </Link>
);

/** A whole card that is a link — icon badge, title, one line, corner arrow. */
export const ActionCard: React.FC<{
  href: string;
  icon: React.ReactNode;
  title: string;
  hint?: string;
}> = ({ href, icon, title, hint }) => (
  <Link href={href} className="block">
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-3xl p-5 border border-[#E5E5E0] shadow-xs flex items-start gap-4 hover:border-[#18181B] transition-all group h-full"
    >
      <IconBadge icon={icon} size="lg" className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-sm font-bold text-[#18181B] group-hover:underline">{title}</h5>
          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#18181B] transition-colors shrink-0" />
        </div>
        {hint && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{hint}</p>}
      </div>
    </motion.div>
  </Link>
);

/** Compact square tile — icon badge over a label. Used in pairs/grids. */
export const TileLink: React.FC<{ href: string; icon: React.ReactNode; label: string }> = ({
  href,
  icon,
  label,
}) => (
  <Link href={href} className="block">
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-3xl p-4 border border-[#E5E5E0] shadow-xs text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#18181B] transition-all"
    >
      <IconBadge icon={icon} size="md" />
      <span className="text-xs font-bold text-[#18181B]">{label}</span>
    </motion.div>
  </Link>
);

// ── Buttons ───────────────────────────────────────────────────

export const PillButton: React.FC<
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> & {
    variant?: 'ink' | 'accent' | 'outline' | 'ghost' | 'danger';
    icon?: React.ReactNode;
    size?: 'sm' | 'md';
  }
> = ({ variant = 'ink', icon, size = 'md', className = '', children, ...props }) => {
  const variants = {
    ink: 'bg-[#18181B] hover:bg-black text-white shadow-md',
    accent: 'bg-[#D7FD44] hover:bg-[#C3EB30] text-[#18181B]',
    outline: 'bg-white text-[#18181B] border border-[#E5E5E0] hover:border-[#18181B]',
    ghost: 'bg-transparent text-[#6B7280] hover:text-[#18181B]',
    danger: 'bg-[#C81E4A] hover:bg-[#a81840] text-white',
  };
  const sizes = { sm: 'py-2 px-4 text-[11px]', md: 'py-3 px-6 text-xs' };

  return (
    <motion.button
      whileHover={props.disabled ? undefined : { scale: 1.02 }}
      whileTap={props.disabled ? undefined : { scale: 0.98 }}
      className={`font-bold rounded-full inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
};

export const PillLink: React.FC<{
  href: string;
  children: React.ReactNode;
  variant?: 'ink' | 'accent' | 'outline';
  icon?: React.ReactNode;
  className?: string;
}> = ({ href, children, variant = 'ink', icon, className = '' }) => (
  <Link href={href}>
    <PillButton variant={variant} icon={icon} className={className}>
      {children}
    </PillButton>
  </Link>
);

// ── Page header ───────────────────────────────────────────────

/**
 * The oversized two-line display heading with an icon-in-circle sitting inline
 * between words, plus the top-right primary CTA.
 */
export const PageHeader: React.FC<{
  line1: string;
  /** Word that follows the plain circle on line 1. */
  line1Tail?: string;
  /** Glyph in the plain circle on line 1. */
  glyph?: React.ReactNode;
  line2?: string;
  /** Word that follows the lime circle on line 2. */
  line2Tail?: string;
  /** Glyph in the lime circle on line 2. */
  accentGlyph?: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: string;
}> = ({ line1, line1Tail, glyph, line2, line2Tail, accentGlyph, action, subtitle }) => (
  <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
    <div className="space-y-1">
      <h1 className="text-4xl sm:text-5xl font-black text-[#18181B] tracking-tight flex items-center gap-3 flex-wrap leading-tight">
        {line1}
        {glyph && (
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white">
            {glyph}
          </span>
        )}
        {line1Tail}
      </h1>
      {line2 && (
        <h1 className="text-4xl sm:text-5xl font-black text-[#18181B] tracking-tight flex items-center gap-3 flex-wrap leading-tight">
          {line2}
          {accentGlyph && (
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#D7FD44] text-[#18181B]">
              {accentGlyph}
            </span>
          )}
          {line2Tail}
        </h1>
      )}
      {subtitle && <p className="text-sm text-gray-500 max-w-2xl pt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex items-center gap-3 pt-2">{action}</div>}
  </div>
);

// ── Pill tab strip (in-page secondary nav) ────────────────────

export const PillTabs: React.FC<{
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ tabs, active, onChange, className = '' }) => (
  <div
    role="tablist"
    className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none ${className}`}
  >
    {tabs.map((tab) => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(tab.id)}
          className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            isActive
              ? 'bg-[#18181B] text-white shadow-xs'
              : 'bg-white text-[#18181B] hover:bg-[#F4F4EF] border border-[#E5E5E0]'
          }`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

// ── Empty / error ─────────────────────────────────────────────

/**
 * Formalises the dashboard's own soft empty state ("0 Active", "0 in
 * evaluation") so every list renders the same thing when it has no rows.
 */
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, hint, action, className = '' }) => (
  <div
    className={`bg-white rounded-3xl border border-[#E5E5E0] p-10 text-center flex flex-col items-center gap-3 ${className}`}
  >
    <IconBadge icon={icon ?? <FileX2 className="w-5 h-5" />} size="lg" />
    <div className="space-y-1">
      <div className="font-bold text-sm text-[#18181B]">{title}</div>
      {hint && <div className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">{hint}</div>}
    </div>
    {action}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  detail?: string;
  endpoint?: string;
  onRetry?: () => void;
  className?: string;
}> = ({ title = 'Could not load this', detail, endpoint, onRetry, className = '' }) => (
  <div
    className={`bg-white rounded-3xl border border-[#E5E5E0] p-8 text-center flex flex-col items-center gap-3 ${className}`}
  >
    <IconBadge icon={<RefreshCw className="w-5 h-5" />} size="lg" tone="danger" />
    <div className="space-y-1">
      <div className="font-bold text-sm text-[#18181B]">{title}</div>
      {detail && <div className="text-xs text-gray-500 max-w-md mx-auto">{detail}</div>}
      {endpoint && <div className="font-mono text-[10px] text-gray-400">{endpoint}</div>}
    </div>
    {onRetry && (
      <PillButton variant="outline" size="sm" onClick={onRetry}>
        Retry
      </PillButton>
    )}
  </div>
);

/** Small note used wherever the UI has to be honest about MVP scope. */
export const ScopeNote: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`bg-[#F8F8F4] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-[11px] text-gray-500 leading-relaxed ${className}`}
  >
    {children}
  </div>
);
