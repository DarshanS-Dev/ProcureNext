# ProcureNext Design System

Extracted from the hand-redesigned `frontend/app/startup/dashboard/page.tsx`.
That page is the source of truth for the look; this document and the components
under `frontend/components/shared/design-system/` are that look, made reusable.

**If you want to restyle the app, edit these files — not the pages.**

| File | What lives there |
| --- | --- |
| `design-system/tokens.ts` | Every colour, the series ramp, the risk ramp, radii |
| `design-system/primitives.tsx` | `Card`, `HeroCard`, `IconBadge`, `StatPill`, `Eyebrow`, `BigStat`, `ActionCard`, `TileLink`, `PillButton`, `PillLink`, `PageHeader`, `PillTabs`, `EmptyState`, `ErrorState`, `ScopeNote` |
| `design-system/charts.tsx` | `CapsuleBarChart`, `DonutRing`, `RadarChart`, `ProgressCapsule`, `CapsuleGauge`, `DotTrack`, `Stepper` |
| `design-system/nav-config.ts` | Per-role top-nav items and primary CTA |
| `design-system/TopNav.tsx` | The persistent top bar |
| `design-system/NotificationBell.tsx` | Client-derived activity feed |
| `design-system/index.ts` | Barrel — pages import from here |

---

## 1. Palette

Three colours carry the whole design. Everything else is semantic and rationed.

| Token | Value | Use |
| --- | --- | --- |
| `tone.bg` | `#F4F4EF` | Page background, warm off-white |
| `tone.surface` | `#FFFFFF` | Card fill |
| `tone.border` | `#E5E5E0` | Card hairline |
| `tone.ink` | `#18181B` | Text, active nav pill, hero cards, bar fills |
| `tone.accent` | `#D7FD44` | **The** accent — lime |
| `tone.ok / warn / danger` | green / amber / rose | Pass-fail and risk only |

**The accent rule:** lime is never a wash. Per page it appears on at most one
hero card, the key number inside a chart, and the active state. If a screen has
two lime cards, one of them is wrong.

Risk levels use a fixed three-stop ramp (`riskColor`), matching the backend's
own LOW/MEDIUM/HIGH bands — never a gradient, because the data is banded, not
continuous.

## 2. Shape language

- Buttons and nav: **fully rounded pills** (`rounded-full`).
- Cards: **large radius**, `rounded-3xl` (24px). Never a square corner.
- Icon badges: **circles** — grey circle, black glyph (`IconBadge`).
- Percentages and states: **black rounded pills** (`StatPill`) — `90%`, `TRL 7`,
  `Action Needed`.

## 3. Typography

- Headings: heavy black display weight, tight leading, `font-black` +
  `tracking-tight`. The H1 treatment mixes words with inline icon circles —
  that is `PageHeader`, and every page uses it.
- Eyebrows: `text-xs font-bold uppercase tracking-wider`.
- Body: clean sans (Inter), grey, `leading-relaxed`.
- One big number per card at `text-4xl font-black`.

## 4. Card anatomy

Every card is the same four parts:

```
┌─────────────────────────────────────────┐
│ (●) EYEBROW LABEL            [stat pill] │   ← IconBadge + Eyebrow + aside
│                                          │
│   42  submitted                          │   ← BigStat
│   ▓▓▓▓▓░░░░                              │   ← the one visual
│ ───────────────────────────────────────  │
│ 3 in evaluation              Track →     │   ← footer + CardLink
└─────────────────────────────────────────┘
```

`HeroCard` is the same anatomy with an inverted fill, reserved for the single
most action-relevant item on a page. It has two states and they mean something:

- `state="ink"` — black. Something is still required of the user.
- `state="ready"` — lime. The gate is satisfied.

Decision Readiness, Sandbox verdict and the KPI pilot-success card all use that
flip. Do not use `HeroCard` decoratively.

## 5. Data visualisation

| Component | Shape | Where |
| --- | --- | --- |
| `CapsuleBarChart` | Rounded track, ink fill from the bottom, lime inner fill, dot marker, floating `%` pill | Activity over time |
| `DonutRing` | Ring + big centred total + legend | Any status breakdown |
| `RadarChart` | N-axis polygon, lime fill, ink outline | TRL readiness (5 axes), rubric (7 axes) |
| `ProgressCapsule` | Segmented bar, dashed → solid | Registration, form completion |
| `CapsuleGauge` | The capsule stood on end, coloured by band | Risk categories |
| `DotTrack` | Dots on a rail, grey → lime | Decision-readiness gates |
| `Stepper` | Nodes + connectors + state pills | Milestones, application status |

**Every one of these takes real rows and has an explicit empty state.** None of
them fabricate a series. If a screen has no data yet, it renders the empty
state — that is the honest answer, and it is styled to match.

## 6. Navigation

One persistent top bar, no sidebar at any breakpoint:

`[logo lockup] [pill-segment nav] ······ [bell] [primary CTA pill] [sign out]`

- Active route: solid ink pill. Inactive: plain text, white on hover.
- Below `md`, the pill row scrolls horizontally. There is no drawer and no
  hamburger.
- The two shared detail shells keep this bar above their own tab strip; in-page
  tabs use `PillTabs`, which is visually the same pill row one level down.

Per-role nav contents and the primary CTA live in `nav-config.ts`:

| Role | Primary CTA |
| --- | --- |
| Startup | Explore Opportunities |
| Officer | New Problem Statement |
| Evaluator | My Assignments |
| Independent Evaluator | Pending Reviews |
| Admin | Compliance Queue |

## 7. Ground rules

1. **Every visual renders real data from a real endpoint.** No placeholder
   series, no invented scores, no chart that implies a capability the backend
   does not have.
2. **Sparse data gets an honest empty state**, not filler.
3. **Read-only stays read-only.** Admin's fixed-rule and template views show no
   edit affordance, because no write endpoint exists for them.
4. **No new primitive per page.** If a screen needs a shape this system lacks,
   add it here.
5. **No new routes.** This is a visual pass over the locked page architecture.
