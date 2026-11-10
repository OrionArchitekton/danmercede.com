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
    fontFamily: "Inter, sans-serif"
    fontSize: "72px"
    fontWeight: 700
  heading:
    fontFamily: "Inter, sans-serif"
    fontSize: "36px"
    fontWeight: 700
  body:
    fontFamily: "Inter, sans-serif"
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
  sm: "2px"
  base: "4px"
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
| Guard | `tests/brandContrast.test.ts`: tokens equal the logo pack, and every brand pair meets WCAG AA |

## Palette

Logo pack colors:

| Name | Hex | Use on the site |
|---|---|---|
| Midnight Navy | `#020B29` | Page background (`bg-slate-950`, `void`, `navy-midnight`); dark labels on copper buttons (`text-slate-950`) |
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
- Navy labels on copper fills: on Copper Mid 7.07:1, on the `copper-400` hover 8.57:1.
- `copper-400` text on the translucent copper tints (10, 15, 20 percent): 7.73, 7.19 and 6.59 to 1.
- White on Copper Dark: 4.93:1, so Copper Dark may carry white text. Copper Dark on Midnight Navy is 3.94:1: large
  text and UI only, never body text.
- Rule: text on a solid copper fill is Midnight Navy, never white.

## Typography

- Inter is the current sans for display, headings and body (300 to 700 from Google Fonts). The logo pack defines no
  typeface, so Inter stays unchanged for now (open question below).
- JetBrains Mono carries labels, metadata and section kickers, mostly uppercase with wide tracking.
- The scale lists the sizes the pages use, from the 10px and 11px mono labels to the 72px hero heading.

## Shape

Small radii: `rounded-sm` (2px) for buttons and chips, `rounded-lg` (8px) for panels and media, `rounded-full` for
pills and avatars.

## Open questions for Dan

1. BLOCKING, accessibility: white on Copper Mid, `#FFFFFF on #E68249`, is 2.74:1. It appears in the skip link focus
   state and the text selection highlight (`App.tsx`). It predates the logo pack alignment (Copper Mid did not
   change). The site's own button pattern, a navy label on copper, would give 7.07:1.
2. BLOCKING, accessibility: `slate-500` text on the page, `#64748b on #020B29`, is 4.08:1 (it was 4.24:1 on the old
   `#020617` background; it failed AA before and after). It is used for small metadata labels.
3. Inter: keep it, or choose a brand typeface? The logo pack defines none, and Inter is on common overused-font lists.
4. `copper-400` `#F0975A` has no logo pack value but carries most accent text. Keep it as a site-only step, or map it?
5. Deep Navy is defined but unused. Should raised surfaces (now `slate-900` and `slate-800`) move to it?
6. The legacy slate, amber and emerald values have no logo pack counterparts. Keep, or fold into a navy-based scale?
7. The 10px mono labels sit under the 11px floor that the Impeccable detector uses for functional text.
8. `docs/one-sheets/speaking-one-sheet.html` (the printable one-sheet, outside the site build) still uses the old
   copper `#c2632c`.
