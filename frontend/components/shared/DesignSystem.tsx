'use client';

/**
 * Compatibility layer over the real design system.
 *
 * The old "government paper" theme lived here — five role colour palettes,
 * sticky notes, rubber-stamp buttons, watermarks, serif headings, ruled paper.
 * All of it is gone. These exports keep their old names and prop shapes so the
 * pages importing them still compile, but every one now renders in the single
 * ink + lime language defined in `design-system/`.
 *
 * New code should import from `@/components/shared/design-system` directly.
 * Anything here exists only so existing call sites keep working.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Rocket, Scale, ShieldCheck as AdminShield, TestTube2 } from 'lucide-react';
import { UserRole } from '@/lib/types/api';
import {
  Card,
  IconBadge,
  PageHeader as DisplayHeader,
  PillButton,
  StatPill,
} from '@/components/shared/design-system';

// ─────────────────────────────────────────────────
// Role identity — an icon and a label, no colour
// ─────────────────────────────────────────────────

/**
 * Roles no longer carry a colour. In this system colour means state (pass,
 * fail, risk band, active) and never identity — five tinted role palettes
 * competing with the accent was the main reason the old theme read as noisy.
 *
 * The colour fields survive as neutral values so any inline style still
 * referencing them stays on-palette.
 */
export const ROLE_PALETTE: Record<
  UserRole,
  {
    tintBg: string;
    accentText: string;
    accentBorder: string;
    label: string;
    icon: React.ReactNode;
  }
> = {
  startup: {
    tintBg: '#F3F3EE',
    accentText: '#18181B',
    accentBorder: '#E5E5E0',
    label: 'Startup Founder',
    icon: <Rocket className="w-3.5 h-3.5" />,
  },
  officer: {
    tintBg: '#F3F3EE',
    accentText: '#18181B',
    accentBorder: '#E5E5E0',
    label: 'Nodal Officer',
    icon: <Building2 className="w-3.5 h-3.5" />,
  },
  evaluator: {
    tintBg: '#F3F3EE',
    accentText: '#18181B',
    accentBorder: '#E5E5E0',
    label: 'Evaluator',
    icon: <Scale className="w-3.5 h-3.5" />,
  },
  'independent-evaluator': {
    tintBg: '#F3F3EE',
    accentText: '#18181B',
    accentBorder: '#E5E5E0',
    label: 'Sandbox Evaluator',
    icon: <TestTube2 className="w-3.5 h-3.5" />,
  },
  admin: {
    tintBg: '#F3F3EE',
    accentText: '#18181B',
    accentBorder: '#E5E5E0',
    label: 'Platform Admin',
    icon: <AdminShield className="w-3.5 h-3.5" />,
  },
};

// ─────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────

type StatusType =
  | 'published' | 'draft' | 'active' | 'closed'
  | 'applied' | 'under_review' | 'under_evaluation'
  | 'selected' | 'contracted' | 'completed' | 'not_selected'
  | 'pending' | 'verified' | 'info' | 'warning' | 'success' | 'error';

/**
 * Pipeline stages read as neutral ink; only real outcomes take a colour, so a
 * queue of six applications no longer looks like a paint chart.
 */
const STATUS_TONES: Record<
  StatusType,
  'ink' | 'accent' | 'ghost' | 'ok' | 'warn' | 'danger' | 'info'
> = {
  published: 'accent',
  draft: 'ghost',
  active: 'accent',
  closed: 'ghost',
  applied: 'ghost',
  under_review: 'ink',
  under_evaluation: 'ink',
  selected: 'accent',
  contracted: 'ink',
  completed: 'ok',
  not_selected: 'danger',
  pending: 'ghost',
  verified: 'ok',
  info: 'info',
  warning: 'warn',
  success: 'ok',
  error: 'danger',
};

export const StatusBadge: React.FC<{
  status: StatusType;
  label?: string;
  dot?: boolean;
  className?: string;
}> = ({ status, label, dot = false, className = '' }) => (
  <StatPill tone={STATUS_TONES[status] ?? 'ghost'} className={className}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
    {label ?? status.replace(/_/g, ' ')}
  </StatPill>
);

export const RoleBadge: React.FC<{ role: UserRole; className?: string }> = ({
  role,
  className = '',
}) => {
  const p = ROLE_PALETTE[role];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#F3F3EE] text-[#18181B] ${className}`}
    >
      {p.icon}
      {p.label}
    </span>
  );
};

// ─────────────────────────────────────────────────
// Callout (was: sticky note)
// ─────────────────────────────────────────────────

/**
 * Was a rotated paper note with a crease and a wobble animation. Now a plain
 * inset panel — the information was never improved by the skeuomorphism.
 */
export const StickyNote: React.FC<{
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  title?: string;
  className?: string;
  animate?: boolean;
}> = ({ children, title, className = '' }) => (
  <div className={`rounded-2xl bg-[#F3F3EE] px-4 py-3 text-xs leading-relaxed ${className}`}>
    {title && (
      <div className="font-extrabold uppercase tracking-wider text-[10px] mb-1 text-[#6B7280]">
        {title}
      </div>
    )}
    <div className="text-[#18181B] font-medium">{children}</div>
  </div>
);

// ─────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────

interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
  hover?: boolean;
}

export const DataCard: React.FC<DataCardProps> = ({
  children,
  className = '',
  noPad = false,
  hover = false,
  style,
  ...props
}) => (
  <div
    {...props}
    className={`bg-white rounded-3xl border border-[#E5E5E0] shadow-sm ${
      noPad ? '' : 'p-6'
    } transition-colors duration-200 ${hover ? 'hover:border-[#18181B] cursor-pointer' : ''} ${className}`}
    style={style}
  >
    {children}
  </div>
);

/**
 * Was a printed government form: coloured top rule, reference number in the
 * corner, a giant serif watermark and a rubber stamp. Now a titled card.
 */
export const DocumentForm: React.FC<{
  title: string;
  subtitle?: string;
  refNumber?: string;
  role?: UserRole;
  children: React.ReactNode;
  watermark?: string;
  className?: string;
  stampLabel?: string;
}> = ({ title, subtitle, refNumber, children, className = '', stampLabel }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`bg-white rounded-3xl border border-[#E5E5E0] shadow-sm p-6 ${className}`}
  >
    <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-[#F0F0EA]">
      <div className="min-w-0">
        <h2 className="text-base font-black text-[#18181B] tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {stampLabel && <StatPill tone="accent">{stampLabel}</StatPill>}
        {refNumber && <StatPill tone="ghost">{refNumber}</StatPill>}
      </div>
    </div>
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────────
// Form fields
// ─────────────────────────────────────────────────

export const FormField: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  classified?: boolean;
}> = ({ label, required, hint, children, classified }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
        {label}
        {required && <span className="text-[#C81E4A] ml-1">*</span>}
      </label>
      {classified && <StatPill tone="ghost">Sealed</StatPill>}
    </div>
    {children}
    {hint && <p className="text-[10px] text-gray-400 leading-relaxed">{hint}</p>}
  </div>
);

const FIELD_BASE =
  'w-full bg-[#F4F4EF] border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-sm text-[#18181B] font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#18181B] transition-colors';

export const DocInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { lineStyle?: boolean }
> = ({ lineStyle, className = '', ...props }) => (
  <input {...props} className={`${FIELD_BASE} ${className}`} />
);

export const DocTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { lineStyle?: boolean }
> = ({ lineStyle, className = '', ...props }) => (
  <textarea {...props} className={`${FIELD_BASE} py-3 leading-relaxed ${className}`} />
);

export const DocSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <select
    {...props}
    className={`${FIELD_BASE} cursor-pointer appearance-none pr-10 ${className}`}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 14px center',
    }}
  >
    {children}
  </select>
);

// ─────────────────────────────────────────────────
// Buttons — pills, ink primary
// ─────────────────────────────────────────────────

type LegacyVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'stamp';

const VARIANT_MAP: Record<LegacyVariant, 'ink' | 'outline' | 'ghost' | 'danger' | 'accent'> = {
  primary: 'ink',
  secondary: 'outline',
  ghost: 'ghost',
  danger: 'danger',
  stamp: 'accent',
};

export const DocButton: React.FC<
  Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
  > & {
    variant?: LegacyVariant;
    role?: UserRole;
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    loading?: boolean;
  }
> = ({ variant = 'primary', role, size = 'md', icon, loading, children, disabled, ...props }) => (
  <PillButton
    variant={VARIANT_MAP[variant]}
    size={size === 'lg' ? 'md' : size}
    disabled={loading || disabled}
    icon={
      loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )
    }
    {...props}
  >
    {children}
  </PillButton>
);

export const DocLinkButton: React.FC<{
  href: string;
  variant?: LegacyVariant;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ href, variant = 'primary', size = 'md', icon, children, className = '' }) => (
  <Link href={href} className={className}>
    <DocButton variant={variant} size={size} icon={icon}>
      {children}
    </DocButton>
  </Link>
);

// ─────────────────────────────────────────────────
// Page header
// ─────────────────────────────────────────────────

/**
 * Maps the old title/subtitle/breadcrumb API onto the display header. The
 * breadcrumb becomes a small pill trail — the top nav already carries the
 * primary wayfinding, so it no longer needs to shout.
 */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  phase?: string;
  role?: UserRole;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  stickyNote?: React.ReactNode;
}> = ({ title, subtitle, phase, breadcrumb, actions, headerActions }) => (
  <div className="space-y-3">
    {(breadcrumb?.length || phase) && (
      <div className="flex items-center gap-2 flex-wrap">
        {phase && <StatPill tone="ghost">{phase}</StatPill>}
        {breadcrumb?.map((crumb, i) => (
          <React.Fragment key={`${crumb.label}-${i}`}>
            {i > 0 && <span className="text-gray-300 text-xs">/</span>}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-[11px] font-bold text-gray-400 hover:text-[#18181B] transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-[11px] font-bold text-[#18181B]">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    )}
    <DisplayHeader line1={title} subtitle={subtitle} action={actions ?? headerActions} />
  </div>
);

// ─────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────

type AlertType = 'info' | 'success' | 'warning' | 'error' | 'lock' | 'danger';

const ALERT_STYLES: Record<AlertType, { bg: string; text: string; icon: string }> = {
  info: { bg: '#F3F3EE', text: '#18181B', icon: 'i' },
  success: { bg: '#EAF7ED', text: '#166534', icon: '✓' },
  warning: { bg: '#FEF6E7', text: '#92400E', icon: '!' },
  error: { bg: '#FBEAEC', text: '#9F1239', icon: '×' },
  danger: { bg: '#FBEAEC', text: '#9F1239', icon: '×' },
  lock: { bg: '#F3F3EE', text: '#3F3F46', icon: '·' },
};

export const AlertStrip: React.FC<{
  type: AlertType;
  children?: React.ReactNode;
  title?: string;
  message?: string;
  className?: string;
}> = ({ type, children, title, message, className = '' }) => {
  const s = ALERT_STYLES[type] ?? ALERT_STYLES.info;
  return (
    <div
      className={`p-4 rounded-2xl flex items-start gap-3 text-xs ${className}`}
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span
        className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center text-[11px] font-black shrink-0"
        aria-hidden
      >
        {s.icon}
      </span>
      <div className="space-y-0.5 min-w-0">
        {title && <div className="font-extrabold text-[11px] uppercase tracking-wide">{title}</div>}
        {message && <div className="leading-relaxed">{message}</div>}
        {children}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// Metric card / rows / divider
// ─────────────────────────────────────────────────

export const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  role?: UserRole;
  trend?: string;
  trendUp?: boolean;
}> = ({ label, value, icon, trend, trendUp }) => (
  <Card icon={icon} label={label}>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-black text-[#18181B] tracking-tight tabular-nums">{value}</span>
      {trend && <StatPill tone={trendUp ? 'ok' : 'ghost'}>{trend}</StatPill>}
    </div>
  </Card>
);

export const DocRow: React.FC<{
  title?: string;
  subtitle?: string;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  refNum?: string;
  children?: React.ReactNode;
  className?: string;
  hover?: boolean;
}> = ({
  title,
  subtitle,
  meta,
  badge,
  actions,
  onClick,
  refNum,
  children,
  className = '',
  hover = true,
}) => (
  <motion.div
    whileHover={hover ? { backgroundColor: '#F8F8F4' } : undefined}
    onClick={onClick}
    className={`px-6 py-4 border-b border-[#F0F0EA] last:border-b-0 transition-colors ${
      onClick ? 'cursor-pointer' : ''
    } ${className}`}
  >
    {children ?? (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {refNum && (
              <span className="font-mono text-[10px] text-gray-400 shrink-0">{refNum}</span>
            )}
            {title && <h3 className="text-sm font-bold text-[#18181B] truncate">{title}</h3>}
            {badge}
          </div>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          {meta && <div className="text-[11px] text-gray-400 font-medium">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    )}
  </motion.div>
);

export const SectionDivider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-5">
    <div className="flex-1 border-t border-[#F0F0EA]" />
    {label && (
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280] bg-[#F3F3EE] px-3 py-1 rounded-full">
        {label}
      </span>
    )}
    <div className="flex-1 border-t border-[#F0F0EA]" />
  </div>
);

export { IconBadge };
