/**
 * Design tokens extracted from the hand-redesigned `app/startup/dashboard`.
 *
 * That page is the single source of truth for the visual language; these are
 * the literal values it uses, named so no other page has to re-type a hex.
 */

export const tone = {
  /** Page background — warm off-white. */
  bg: '#F4F4EF',
  /** Card surface. */
  surface: '#FFFFFF',
  /** Muted surface used for icon badges and inset panels. */
  surfaceMuted: '#F3F3EE',
  /** Hairline card border. */
  border: '#E5E5E0',
  /** Softer divider inside a card. */
  divider: '#F0F0EA',
  /** "Ink" — the primary near-black used for text, hero cards, active pills. */
  ink: '#18181B',
  inkSoft: '#6B7280',
  inkFaint: '#9CA3AF',
  /** The single accent. Used sparingly: one hero card, key numbers, active state. */
  accent: '#D7FD44',
  accentBorder: '#C3EB30',
  accentDeep: '#B6DB2D',
  /** Semantic — only for pass/fail and risk, never as decoration. */
  ok: '#1E9E5A',
  okTint: '#EAF7ED',
  warn: '#F59E0B',
  warnTint: '#FEF6E7',
  danger: '#C81E4A',
  dangerTint: '#FBEAEC',
  info: '#2563EB',
  infoTint: '#E9F1FB',
} as const;

/** Categorical series colours for donuts/legends, ordered by priority. */
export const seriesColors = [
  tone.ink,
  tone.accent,
  '#60A5FA',
  '#34D399',
  '#A78BFA',
  '#FBBF24',
  '#F87171',
  '#94A3B8',
] as const;

/** Risk levels map to a fixed three-stop ramp (Doc B: >=70 low / 40-69 med / <40 high). */
export const riskColor = {
  low: tone.ok,
  medium: tone.warn,
  high: tone.danger,
} as const;

export const radius = {
  card: 'rounded-3xl',
  cardSm: 'rounded-2xl',
  pill: 'rounded-full',
} as const;

/** Shared card chrome, so no page hand-rolls its own border/shadow combo. */
export const cardClass =
  'bg-white rounded-3xl border border-[#E5E5E0] shadow-sm';
