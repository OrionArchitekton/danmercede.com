# Dan Mercede Expanded Brand System (v2.0: The Meridian Monograph)

## 1. Preserved Core Identity
- **Primary Lockup:** `/public/dan-mercede-lockup-dark.svg` (and `-light.svg`)
- **Primary Geometric Mark:** `/public/dm-mark.svg` (hexagonal boundary vertices at 60-degree intervals enclosing D+M structural monogram)
- **Authoritative Palette Tokens:**
  - Midnight Navy Ground: `#020B29`
  - Deep Navy Raised Surface: `#07143A`
  - Copper Light (Highlight & Primary CTA fill): `#FFC08B`
  - Copper 400 (Hover / Active Accent): `#F0975A`
  - Copper Mid (Structural rule, border, primary link): `#E68249`
  - Copper Dark (Deep border / badge header): `#B95122`
  - Archival White: `#FFFFFF`

## 2. Expanded v2.0 Brand Kit (`public/brand/`)
All new brand assets preserve the exact geometry, aspect angles, and hex palette of `dm-mark.svg` without altering the original lockups:
- `dm-seal-architectural.svg`: Circular coordinate frame with vernier degree ticks around the core hexagon and internal D+M monogram.
- `dm-monogram-compact.svg`: Optical small-size hexagon emblem for dense navigation badges and favicons.
- `dm-colophon-signature.svg`: Horizontal publication colophon divider combining hexagon monogram, `DAN MERCEDE`, and `OPERATOR // SYSTEMS`.
- `dm-mark-animated.svg`: CSS stroke/node pulse mark respecting `@media (prefers-reduced-motion: reduce)`.
- `dm-blueprint-pattern.svg`: Seamless 96px architectural hairline + fiducial crosshair background tile.
- `public/media/blender/meridian-monolith-{480w,960w}.{avif,webp}` & `meridian-monolith.glb`: Procedural Blender 5.2 sculptural architectural polyhedron (anodized navy facets, chamfered brushed copper bezel, 6 governance coordinate nodes).

## 3. Clear Space, Contrast & Usage Rules
- Maintain minimum clear space around `dm-mark` and `dm-seal-architectural` equal to 25% of emblem diameter on all edges.
- Never place White text on solid Copper backgrounds (`#FFC08B`, `#F0975A`, `#E68249`, `#B95122`); always use Midnight Navy `#020B29` (`text-slate-950`).
- Zero Unicode long dashes (`U+2013`, `U+2014`, `U+2015`) across all titles, UI labels, diagrams, and copy.
- Self-hosted variable typography: `Newsreader` (editorial serif, optical sizing), `IBM Plex Sans` (UI and prose), `JetBrains Mono` (`tabular-nums` folio labels, minimum `11px`).
