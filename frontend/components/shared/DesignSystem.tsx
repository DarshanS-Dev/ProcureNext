'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { UserRole } from '@/lib/types/api';

import { Rocket, Building2, Scale, TestTube2, ShieldCheck as AdminShield } from 'lucide-react';

// ─────────────────────────────────────────────────
// ROLE COLOR CONFIG  (matches AuthPage palette)
// ─────────────────────────────────────────────────
export const ROLE_PALETTE: Record<UserRole, {
  tintBg: string;
  accentText: string;
  accentBorder: string;
  label: string;
  icon: React.ReactNode;
}> = {
  startup: {
    tintBg: '#EAF7ED',
    accentText: '#1E9E5A',
    accentBorder: '#B8E6C4',
    label: 'Startup Founder',
    icon: <Rocket className="w-3.5 h-3.5" />,
  },
  officer: {
    tintBg: '#FDF3DC',
    accentText: '#B8860B',
    accentBorder: '#F7E1B5',
    label: 'Nodal Officer',
    icon: <Building2 className="w-3.5 h-3.5" />,
  },
  evaluator: {
    tintBg: '#E9F1FB',
    accentText: '#2563EB',
    accentBorder: '#BFD7F8',
    label: 'Evaluator',
    icon: <Scale className="w-3.5 h-3.5" />,
  },
  'independent-evaluator': {
    tintBg: '#FBEFE6',
    accentText: '#D2691E',
    accentBorder: '#F0CDB5',
    label: 'Sandbox Evaluator',
    icon: <TestTube2 className="w-3.5 h-3.5" />,
  },
  admin: {
    tintBg: '#FBEAEC',
    accentText: '#C81E4A',
    accentBorder: '#F3BECA',
    label: 'Platform Admin',
    icon: <AdminShield className="w-3.5 h-3.5" />,
  },
};

// ─────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────
type StatusType =
  | 'published' | 'draft' | 'active' | 'closed'
  | 'applied' | 'under_review' | 'under_evaluation'
  | 'selected' | 'contracted' | 'completed' | 'not_selected'
  | 'pending' | 'verified' | 'info' | 'warning' | 'success' | 'error';

const STATUS_COLORS: Record<StatusType, { bg: string; text: string; border: string }> = {
  published:         { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
  draft:             { bg: '#F5F5F4', text: '#78716C', border: '#E7E5E4' },
  active:            { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
  closed:            { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  applied:           { bg: '#E9F1FB', text: '#2563EB', border: '#BFD7F8' },
  under_review:      { bg: '#FDF3DC', text: '#B8860B', border: '#F7E1B5' },
  under_evaluation:  { bg: '#FBEFE6', text: '#D2691E', border: '#F0CDB5' },
  selected:          { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
  contracted:        { bg: '#E9F1FB', text: '#2563EB', border: '#BFD7F8' },
  completed:         { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
  not_selected:      { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  pending:           { bg: '#FDF3DC', text: '#B8860B', border: '#F7E1B5' },
  verified:          { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
  info:              { bg: '#E9F1FB', text: '#2563EB', border: '#BFD7F8' },
  warning:           { bg: '#FDF3DC', text: '#B8860B', border: '#F7E1B5' },
  success:           { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
  error:             { bg: '#FBEAEC', text: '#C81E4A', border: '#F3BECA' },
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, dot = true, className = '' }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const displayLabel = label ?? status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase whitespace-nowrap ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: colors.text }}
        />
      )}
      {displayLabel}
    </span>
  );
};

// ─────────────────────────────────────────────────
// ROLE BADGE
// ─────────────────────────────────────────────────
export const RoleBadge: React.FC<{ role: UserRole; className?: string }> = ({ role, className = '' }) => {
  const p = ROLE_PALETTE[role];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${className}`}
      style={{ backgroundColor: p.tintBg, color: p.accentText }}
    >
      <span>{p.icon}</span>
      <span>{p.label}</span>
    </span>
  );
};

// ─────────────────────────────────────────────────
// STICKY NOTE
// ─────────────────────────────────────────────────
type StickyColor = 'yellow' | 'pink' | 'blue' | 'green' | 'mint';

const STICKY_STYLES: Record<StickyColor, { bg: string; border: string; text: string }> = {
  yellow: { bg: '#FFF8C5', border: '#F5E642', text: '#6B5C00' },
  pink:   { bg: '#FFE4F0', border: '#F9A8D4', text: '#831843' },
  blue:   { bg: '#D4EEFF', border: '#93C5FD', text: '#1E3A5F' },
  green:  { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
  mint:   { bg: '#EAF7ED', border: '#B8E6C4', text: '#1E9E5A' },
};

interface StickyNoteProps {
  children: React.ReactNode;
  color?: StickyColor;
  rotate?: number;
  title?: string;
  className?: string;
  animate?: boolean;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  children, color = 'yellow', rotate = -1, title, className = '', animate = true
}) => {
  const s = STICKY_STYLES[color] || STICKY_STYLES.yellow;
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: -8, rotate: rotate - 2 } : undefined}
      animate={animate ? { opacity: 1, y: 0, rotate } : undefined}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative p-3.5 rounded-sm text-xs leading-relaxed ${className}`}
      style={{
        backgroundColor: s.bg,
        borderLeft: `3px solid ${s.border}`,
        color: s.text,
        boxShadow: '2px 3px 8px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.06)',
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {title && (
        <div className="font-bold uppercase tracking-wide text-[10px] mb-1 opacity-60">{title}</div>
      )}
      <div className="font-medium">{children}</div>
      {/* paper crease top-right */}
      <div
        className="absolute top-0 right-0 w-4 h-4"
        style={{
          background: `linear-gradient(225deg, rgba(0,0,0,0.06) 50%, transparent 50%)`,
        }}
      />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────
// DATA CARD  (replaces old brutalist boxes)
// ─────────────────────────────────────────────────
interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
  hover?: boolean;
}

export const DataCard: React.FC<DataCardProps> = ({ children, className = '', noPad = false, hover = false, style, ...props }) => (
  <div
    {...props}
    className={`bg-white rounded-3xl border border-[#E5E5E0] shadow-sm ${noPad ? '' : 'p-6'} relative transition-all duration-200 ${hover ? 'hover:border-[#18181B] hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}
    style={style}
  >
    {children}
  </div>
);

// ─────────────────────────────────────────────────
// DOCUMENT FORM  (looks like an official printed form)
// ─────────────────────────────────────────────────
interface DocumentFormProps {
  title: string;
  subtitle?: string;
  refNumber?: string;
  role?: UserRole;
  children: React.ReactNode;
  watermark?: string;
  className?: string;
  stampLabel?: string;
}

export const DocumentForm: React.FC<DocumentFormProps> = ({
  title, subtitle, refNumber, role, children, watermark, className = '', stampLabel
}) => {
  const palette = role ? ROLE_PALETTE[role] : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`bg-white rounded-xl border border-[#E8E2D5] relative overflow-hidden ${className}`}
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {/* Top accent bar */}
      {palette && (
        <div className="h-1 w-full" style={{ backgroundColor: palette.accentText }} />
      )}

      {/* Document header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#1A1A1A] tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-[#6B6560] mt-0.5 font-medium uppercase tracking-wider">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {refNumber && (
              <span className="font-mono text-[11px] text-[#A89F94] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E8E2D5]">
                {refNumber}
              </span>
            )}
            {stampLabel && (
              <span
                className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded"
                style={{
                  color: palette?.accentText ?? '#6B6560',
                  border: `1.5px solid ${palette?.accentText ?? '#6B6560'}`,
                  opacity: 0.75,
                }}
              >
                {stampLabel}
              </span>
            )}
          </div>
        </div>

        {/* Header rule — double line like a real document */}
        <div className="mt-3" style={{ borderTop: '2px solid #1A1A1A', paddingTop: '1px' }}>
          <div style={{ borderTop: '1px solid #E8E2D5' }} />
        </div>
      </div>

      {/* Form content */}
      <div className="px-6 pb-6 space-y-5">
        {children}
      </div>

      {/* Watermark */}
      {watermark && (
        <div className="watermark">{watermark}</div>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────
// FORM FIELD  (document line-style)
// ─────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  classified?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ label, required, hint, children, classified }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <label className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {classified && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#C81E4A] border border-[#C81E4A] px-1 py-0.5 rounded opacity-70">
          Restricted
        </span>
      )}
    </div>
    {children}
    {hint && (
      <p className="text-[10px] text-[#A89F94] italic">{hint}</p>
    )}
  </div>
);

// Document input (underline style)
interface DocInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  lineStyle?: boolean;
}
export const DocInput: React.FC<DocInputProps> = ({ lineStyle = true, className = '', ...props }) => (
  <input
    {...props}
    className={lineStyle
      ? `w-full bg-transparent border-0 border-b-2 border-[#E5E5E0] focus:border-[#18181B] outline-none px-0 py-2 text-sm text-[#18181B] font-medium placeholder:text-gray-400 transition-colors ${className}`
      : `w-full bg-[#F4F4EF] border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-sm text-[#18181B] font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#18181B] transition-colors ${className}`
    }
  />
);

interface DocTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  lineStyle?: boolean;
}
export const DocTextarea: React.FC<DocTextareaProps> = ({ lineStyle = false, className = '', ...props }) => (
  <textarea
    {...props}
    className={lineStyle
      ? `w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm text-[#18181B] font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#18181B] transition-colors leading-7 ${className}`
      : `w-full bg-[#F4F4EF] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm text-[#18181B] font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#18181B] transition-colors ${className}`
    }
  />
);

export const DocSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`w-full bg-[#F4F4EF] border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-sm text-[#18181B] font-medium focus:outline-none focus:border-[#18181B] transition-colors cursor-pointer appearance-none ${className}`}
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B6560' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
  >
    {children}
  </select>
);

// ─────────────────────────────────────────────────
// BUTTONS
// ─────────────────────────────────────────────────
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'stamp';
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  style?: React.CSSProperties;
}

export const DocButton: React.FC<ButtonProps> = ({
  variant = 'primary', role, size = 'md', icon, loading, children, className = '', style, onClick, disabled, type, ...props
}) => {
  const palette = role ? ROLE_PALETTE[role] : null;

  const sizeClass = {
    sm: 'px-3.5 py-1.5 text-[11px] gap-1.5',
    md: 'px-5 py-2.5 text-xs gap-2',
    lg: 'px-7 py-3.5 text-sm gap-2.5',
  }[size];

  let colorStyle: React.CSSProperties = {};
  let baseClass = '';

  if (variant === 'primary') {
    baseClass = 'bg-[#18181B] hover:bg-black text-white shadow-md';
  } else if (variant === 'secondary') {
    baseClass = 'bg-white text-[#18181B] border border-[#E5E5E0] hover:border-[#18181B]';
  } else if (variant === 'ghost') {
    baseClass = 'bg-transparent text-[#6B7280] hover:text-[#18181B] hover:bg-[#F4F4EF]';
  } else if (variant === 'danger') {
    baseClass = 'bg-[#FBEAEC] text-[#C81E4A] hover:bg-[#C81E4A] hover:text-white';
  } else if (variant === 'stamp') {
    baseClass = 'bg-[#D7FD44] text-[#18181B] hover:bg-[#C3EB30]';
  }

  return (
    <motion.button
      whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
      whileTap={{ y: 0, boxShadow: 'none' }}
      className={`inline-flex items-center justify-center font-bold tracking-wide rounded-full cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sizeClass} ${baseClass} ${className}`}
      style={{ ...colorStyle, ...style }}
      onClick={onClick}
      disabled={loading || disabled}
      type={type}
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : icon}
      {children}
    </motion.button>
  );
};

// Link version of DocButton
interface DocLinkButtonProps {
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'stamp';
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DocLinkButton: React.FC<DocLinkButtonProps> = ({
  href, variant = 'primary', role, size = 'md', icon, children, className = ''
}) => {
  const palette = role ? ROLE_PALETTE[role] : null;

  const sizeClass = {
    sm: 'px-3.5 py-1.5 text-[11px] gap-1.5',
    md: 'px-5 py-2.5 text-xs gap-2',
    lg: 'px-7 py-3.5 text-sm gap-2.5',
  }[size];

  let colorStyle: React.CSSProperties = {};
  let baseClass = '';

  if (variant === 'primary') {
    if (palette) {
      colorStyle = { backgroundColor: palette.accentText, color: '#fff', border: `1.5px solid ${palette.accentText}` };
    } else {
      baseClass = 'bg-[#1A1A1A] text-white border border-[#1A1A1A]';
    }
  } else if (variant === 'secondary') {
    if (palette) {
      colorStyle = { backgroundColor: palette.tintBg, color: palette.accentText, border: `1.5px solid ${palette.accentBorder}` };
    } else {
      baseClass = 'bg-[#F8F6F1] text-[#1A1A1A] border border-[#E8E2D5]';
    }
  } else if (variant === 'ghost') {
    baseClass = 'bg-transparent text-[#6B6560] border border-transparent hover:bg-[#F8F6F1]';
  } else if (variant === 'stamp') {
    if (palette) {
      colorStyle = { color: palette.accentText, border: `2px solid ${palette.accentText}`, backgroundColor: 'transparent' };
    } else {
      baseClass = 'text-[#1A1A1A] border-2 border-[#1A1A1A]';
    }
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center font-bold uppercase tracking-wide rounded-lg cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:translate-y-0 ${sizeClass} ${baseClass} ${className}`}
      style={colorStyle}
    >
      {icon}
      {children}
    </Link>
  );
};



// ─────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  phase?: string;
  role?: UserRole;
  actions?: React.ReactNode;
  action?: React.ReactNode;
  stickyNote?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title, subtitle, phase, role, actions, action, stickyNote, breadcrumb
}) => {
  const palette = role ? ROLE_PALETTE[role] : null;
  const headerActions = actions || action;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3 pb-5 mb-2"
      style={{ borderBottom: '1px solid #E5E5E0' }}
    >
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#A89F94] font-medium">
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-[#1A1A1A] transition-colors">
                  {b.label}
                </Link>
              ) : (
                <span className="text-[#6B6560]">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          {/* Phase chip */}
          {phase && (
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280] bg-[#F3F3EE] px-2.5 py-1 rounded-full">
                {phase}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-[#18181B] tracking-tight leading-tight">
            {title}
          </h1>

          {/* Subtitle + role badge */}
          <div className="flex items-center flex-wrap gap-2">
            {subtitle && (
              <p className="text-xs text-[#6B6560] font-medium">{subtitle}</p>
            )}
            {role && <RoleBadge role={role} />}
          </div>
        </div>

        {/* Right: actions + sticky note */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          {stickyNote && (
            <div className="max-w-[200px]">
              {stickyNote}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────
// ALERT STRIP (replaces plain border boxes)
// ─────────────────────────────────────────────────
type AlertType = 'info' | 'success' | 'warning' | 'error' | 'lock' | 'danger';

const ALERT_STYLES: Record<AlertType, { bg: string; border: string; text: string; icon: string }> = {
  info:    { bg: '#E9F1FB', border: '#BFD7F8', text: '#1E3A8A', icon: 'ℹ️' },
  success: { bg: '#EAF7ED', border: '#B8E6C4', text: '#14532D', icon: '✓' },
  warning: { bg: '#FDF3DC', border: '#F7E1B5', text: '#713F12', icon: '⚠' },
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#7F1D1D', icon: '⛔' },
  danger:  { bg: '#FBEAEC', border: '#F3BECA', text: '#C81E4A', icon: '⛔' },
  lock:    { bg: '#F5F5F4', border: '#E7E5E4', text: '#3D3836', icon: '🔒' },
};

interface AlertStripProps {
  type: AlertType;
  children?: React.ReactNode;
  title?: string;
  message?: string;
  className?: string;
}

export const AlertStrip: React.FC<AlertStripProps> = ({ type, children, title, message, className = '' }) => {
  const s = ALERT_STYLES[type] || ALERT_STYLES.info;
  return (
    <div
      className={`p-4 rounded-2xl flex items-start gap-2.5 text-xs ${className}`}
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="text-sm shrink-0">{s.icon}</span>
      <div className="space-y-0.5">
        {title && <div className="font-bold uppercase text-[11px] tracking-wide">{title}</div>}
        {message && <div className="leading-relaxed">{message}</div>}
        {children}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// METRIC CARD (for dashboards)
// ─────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  role?: UserRole;
  trend?: string;
  trendUp?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, role, trend, trendUp }) => {
  const palette = role ? ROLE_PALETTE[role] : null;
  return (
    <DataCard hover>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A89F94]">{label}</div>
          <div className="text-3xl font-black text-[#1A1A1A]">{value}</div>
          {trend && (
            <div className={`text-[11px] font-semibold ${trendUp ? 'text-[#1E9E5A]' : 'text-[#C81E4A]'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{
              backgroundColor: palette?.tintBg ?? '#F8F6F1',
              color: palette?.accentText ?? '#6B6560',
              border: `1px solid ${palette?.accentBorder ?? '#E8E2D5'}`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </DataCard>
  );
};

// ─────────────────────────────────────────────────
// DOCUMENT ROW (for lists/tables)
// ─────────────────────────────────────────────────
interface DocRowProps {
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
}

export const DocRow: React.FC<DocRowProps> = ({
  title, subtitle, meta, badge, actions, onClick, refNum, children, className = '', hover = true
}) => (
  <motion.div
    whileHover={hover ? { backgroundColor: '#F8F8F4' } : undefined}
    onClick={onClick}
    className={`px-6 py-4 border-b border-[#F0F0EA] last:border-b-0 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children ? children : (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {refNum && (
              <span className="font-mono text-[10px] text-[#A89F94] shrink-0">{refNum}</span>
            )}
            {title && <h3 className="text-sm font-semibold text-[#1A1A1A] truncate">{title}</h3>}
            {badge}
          </div>
          {subtitle && <p className="text-xs text-[#6B6560]">{subtitle}</p>}
          {meta && <div className="text-[11px] text-[#A89F94] font-medium">{meta}</div>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    )}
  </motion.div>
);

// ─────────────────────────────────────────────────
// SECTION DIVIDER
// ─────────────────────────────────────────────────
export const SectionDivider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 border-t border-[#F0F0EA]" />
    {label && (
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280] bg-[#F3F3EE] px-2.5 py-1 rounded-full">
        {label}
      </span>
    )}
    <div className="flex-1 border-t border-[#F0F0EA]" />
  </div>
);
