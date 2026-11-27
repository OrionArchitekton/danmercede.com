---
brand: "danmercede-com"
name: "Dan Mercede"
domain: "danmercede.com"
polarity: "dark"
tokens: "tokens/brand.tokens.json"
---

# danmercede.com Design System

Dark archival editorial system: Midnight Navy (`#020B29`) ground, Deep Navy (`#07143A`) raised panels, crisp slate-white typography, and Copper (`#E68249`) as the single primary accent.

## Palette and Contrast Rules

- Ground: `#020B29` (`oklch(16.37% 0.0639 263.5)`)
- Surface: `#07143A`, Elevated: `#0E1F4F`
- Primary ink: `#F8FAFC` on `#020B29` (`>17:1`)
- Muted metadata: `#94A3B8` on `#020B29` (`7.57:1`). Never use `slate-500` (`4.08:1`).
- Primary CTA rule: text on solid copper fills (`#E68249`, `#F0975A`) is always Midnight Navy (`#020B29`, `>=7.07:1`), never white.

## Typography

- Display / Headings: `Newsreader` (serif)
- Body / UI: `IBM Plex Sans` (sans-serif)
- Metadata / Labels: `JetBrains Mono` (monospace)

## Shape and Motion

- Radii: `2px` (`sm`), `4px` (`md`), `8px` (`lg`).
- Mandatory `prefers-reduced-motion: reduce` disables transitions and animations.

## Social Safe-Zone and Layer-B Brand-Kit Contract

- **Layout Archetype**: Split Editorial Hero (60/40) + Meridian Monograph
- **Profile Avatar (`800x800`)**: Emblem-only centered inside `r <= 352px` (`>=12%` clear margin) for crisp `48px` and `98px` feed legibility.
- **Channel Banners**: YouTube `2560x1440` (`1546x423` center safe box `x: 507..2053, y: 508..931`), LinkedIn `1584x396` (clearing `320x200` bottom-left avatar), X `1500x500` (clearing `420x240` bottom-left avatar), Facebook `851x315` (clearing `220x160` bottom-left avatar), and OpenGraph `1200x630`.
- **Layer-B Isolation**: Identity, positioning, claims, CTAs, and `VoiceProfile.v1` live strictly in git under `brand-kit/`; shared Layer-A skills carry zero brand-private palette literals or exemplars.
