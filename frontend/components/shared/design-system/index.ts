/**
 * The design system, in one import.
 *
 * Structure — edit the file, not the pages:
 *   tokens.ts        colours, radii, series/risk ramps
 *   primitives.tsx   Card, HeroCard, IconBadge, StatPill, buttons, states
 *   charts.tsx       CapsuleBarChart, DonutRing, RadarChart, gauges, steppers
 *   nav-config.ts    per-role top-nav items + primary CTA
 *   TopNav.tsx       the persistent top bar
 *   NotificationBell.tsx  client-derived activity feed
 *
 * See DESIGN_SYSTEM.md in the repo root for the rules these encode.
 */

export * from './tokens';
export * from './primitives';
export * from './charts';
export * from './nav-config';
export { TopNav } from './TopNav';
export { NotificationBell } from './NotificationBell';
