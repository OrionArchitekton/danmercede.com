---
version: "alpha"
name: "Dan Mercede"
description: "Visual system of danmercede.com, aligned to the Dan Mercede logo pack"
colors:
  midnight-navy: "#020B29"
  deep-navy: "#07143A"
  copper-light: "#FFC08B"
  copper-mid: "#E68249"
  copper-dark: "#B95122"
  white: "#FFFFFF"
  copper-400: "#F0975A"
  slate-200: "#E2E8F0"
  slate-300: "#CBD5E1"
  slate-400: "#94A3B8"
  slate-500: "#64748B"
  slate-600: "#475569"
  slate-700: "#334155"
  slate-800: "#1E293B"
  slate-900: "#0F172A"
  amber-500: "#F59E0B"
  emerald-500: "#10B981"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "72px"
    fontWeight: 700
  heading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "36px"
    fontWeight: 700
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
  scale:
    label-sm: "10px"
    label: "11px"
    xs: "12px"
    sm: "14px"
    base: "16px"
    lg: "18px"
    xl: "20px"
    2xl: "24px"
    3xl: "30px"
    4xl: "36px"
    5xl: "48px"
    6xl: "60px"
    7xl: "72px"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
---

# danmercede.com design system

A dark, quiet site: Midnight Navy ground, white and slate text, copper as the single accent. The brand colors come
from the Dan Mercede logo pack (`dan-mercede-logo-pack/brand-colors.txt`), the same values the logo SVGs in
`public/` already use. This file describes what the code ships; if they disagree, update this file in the same
pull request that changes a token.

## Where the tokens live

| Token | Defined in |
|---|---|
| Copper scale, navy, void, font families | `tailwind.config.js` (loaded by `@config` in `index.css`) |
| Page background, slate, amber, emerald | `index.css` (`@theme` block and the `body` rule) |
| Browser theme color | `index.html` `theme-color` meta and `public/site.webmanifest` |
| Guard | `tests/brandContrast.test.ts`: tokens equal the logo pack; the listed brand pairs meet WCAG AA; the markup has no white text on a solid copper fill, no `text-slate-500`, and no translucent copper list numbers |

## Palette

Logo pack colors:

| Name | Hex | Use on the site |
|---|---|---|
| Midnight Navy | `#020B29` | Page background (`bg-slate-950`, `void`, `navy-midnight`); dark labels on copper buttons, the skip link and the text selection (`text-slate-950`) |
| Deep Navy | `#07143A` | Defined as `navy-deep` for raised surfaces; not yet used (see open questions) |
| Copper Light | `#FFC08B` | `copper-300`: highlighted text |
| Copper Mid | `#E68249` | `copper-500`: the primary accent, buttons, borders, focus rings, links |
| Copper Dark | `#B95122` | `copper-600`: the deepest accent, currently one decorative guide card header |
| White | `#FFFFFF` | Headings and emphasis text |

Site colors with no logo pack counterpart, kept as they are: `copper-400` `#F0975A` (secondary accent text and
button hover), and the slate, amber and emerald values pinned in `@theme` (body text, borders, raised surfaces,
status accents).

## Contrast

Ratios below are computed from the hex values by `tests/brandContrast.test.ts` (WCAG 2.x; AA is 4.5:1 for body text,
3:1 for large text and UI):

- Copper text on Midnight Navy: Copper Light 12.16:1, `copper-400` 8.57:1, Copper Mid 7.07:1.
- Navy labels on copper fills: on Copper Mid 7.07:1 (buttons, the skip link focus state, the text selection), on
  the `copper-400` hover 8.57:1.
- Metadata text is `slate-400`, 7.57:1 on the page. `slate-500` measures 4.08:1, below AA, so it is not used for text.
- `copper-400` text on the translucent copper tints (10, 15, 20 percent): 7.73, 7.19 and 6.59 to 1.
- White on Copper Dark measures 4.93:1 (AA), but the site keeps one rule for every solid copper fill, Copper Dark
  included: its text is Midnight Navy, never white. Copper Dark on Midnight Navy is 3.94:1: large text and UI only,
  never body text.
- Ordered-list numbers (`marker:text-copper-500` in `components/Markdown.tsx`) are full-strength Copper Mid, 7.07:1.
  At 70 percent they measured 3.89:1, below AA.
- Rule: text on a solid copper fill is Midnight Navy, never white.

## Typography

- Newsreader is the serif for display and headings (300 to 700, with its optical-size axis, from Google Fonts). One
  base rule in `index.css` sets `h1` to `h4` in it; a heading that carries `font-mono` or `font-sans` keeps that face.
- IBM Plex Sans is the sans for body and interface text (300 to 700 from Google Fonts).
- JetBrains Mono carries labels and metadata. Metadata lines under titles are sentence case; nav, buttons, chips and
  badges keep uppercase with wide tracking.
- The logo pack defines no typeface. The owner chose this pairing on 2026-11-10 from three rendered options.
- `tailwind.config.js` names each web font first with local fallbacks after it, and the one Google Fonts link in
  `index.html` loads exactly those families (`tests/headHygiene.test.ts` fails when they drift apart).
- The scale lists the sizes the pages use, from the 10px and 11px mono labels to the 72px hero heading.

## Shape

Small radii, on the Tailwind v4 scale: `rounded-xs` (2px) for image frames and small tags, `rounded-sm` (4px) for
buttons, chips and the skip link, `rounded-lg` (8px) for panels and media, `rounded-full` for pills and avatars.
Tailwind v4 shifted these names: its `rounded-xs` is v3's `rounded-sm`, and its `rounded-sm` is v3's plain `rounded`.

## Open questions for Dan

1. Resolved 2026-11-10: Newsreader for headings and IBM Plex Sans for body replace Inter (see Typography).
2. `copper-400` `#F0975A` has no logo pack value but carries most accent text. Keep it as a site-only step, or map it?
3. Deep Navy is defined but unused. Should raised surfaces (now `slate-900` and `slate-800`) move to it?
4. The legacy slate, amber and emerald values have no logo pack counterparts. Keep, or fold into a navy-based scale?
5. The 10px mono labels sit under the 11px floor that the Impeccable detector uses for functional text.
6. `docs/one-sheets/speaking-one-sheet.html` (the printable one-sheet, outside the site build) still uses the old
   copper `#c2632c`.
