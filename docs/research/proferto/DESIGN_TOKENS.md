# Proferto — Design Tokens

Extracted from https://app.proferto.io (authenticated, SOLO plan) on 2026-08-05.

## Fonts (Google Fonts)
- **Body / UI:** `"IBM Plex Sans", system-ui, sans-serif` — weights 400, 500, 600, 700
- **Headings / brand:** `"Space Grotesk", system-ui, sans-serif` — weights 500, 600, 700
- **Mono:** `"IBM Plex Mono"` (mono var)
- **Base font-size:** ~14px on body (rem utilities scale to ~14px base — e.g. primary btn fontSize 12.25px = 0.875rem, radius 10.5px = 0.75rem). Body default text 14px.

## Theming mechanism (IMPORTANT)
The app uses **Tailwind slate utility classes** everywhere (`bg-slate-50`, `text-slate-900`, `border-slate-200`, tinted `bg-emerald-50`, etc.). Theme is switched by toggling class `dark` on `<html>`.
- **Light mode:** slate scale = Tailwind defaults (slate-50 light → slate-950 dark). body bg `#f8fafc`.
- **Dark mode:** the slate scale is **inverted** via CSS variable overrides so the SAME utility classes flip automatically. body bg `#0b1220`.

### Dark-mode overridden palette (hex)
```
--color-slate-50:  #0b1220   (body bg)
--color-slate-100: #141d31   (card / panel bg)
--color-slate-200: #25324f   (borders)
--color-slate-300: #33415f   (stronger border)
--color-slate-400: #8c9bb2   (muted text)
--color-slate-500: #a6b3c7   (secondary text)
--color-slate-600: #c0ccda
--color-slate-700: #d6deea   (body text-ish)
--color-slate-800: #e8eef5
--color-slate-900: #f3f7fc   (headings / strong text)
--color-slate-950: #fff
--color-white:     #fff
/* tinted status surfaces (dark) */
--color-blue-50:   #15233f   (active nav bg)
--color-blue-100:  #20355c
--color-indigo-50: #1a1f40   (guide button bg)
--color-violet-50: #20183a
--color-emerald-50:#0f2622
--color-emerald-100:#133329
--color-sky-50:    #11243a
--color-cyan-50:   #0c2630
--color-rose-50:   #2a1722
--color-rose-100:  #3a1f2d
--color-red-50:    #2a1717
--color-red-100:   #3a1d1d
--color-amber-50:  #2a210f
--color-amber-100: #392c12
```
Light mode uses Tailwind's default oklch slate + tint scales.

## Body colors
- Dark: bg `rgb(11,18,32)` #0b1220, text `rgb(231,237,244)` #e7edf4
- Light: bg `rgb(248,250,252)` #f8fafc

## Brand / accent colors
- **Primary (buttons, progress, guide):** indigo/violet `oklch(0.511 0.262 276.966)` ≈ `#4f46e5` (indigo-600). Hover slightly darker.
- **Guide button text/icon:** `oklch(0.457 0.24 277.023)` (violet-600) on bg `#1a1f40`.
- **Active nav item:** text `#93c5fd` (blue-300), bg `#15233f` (blue-50 dark). Inactive text `#d6deea` (slate-700 dark).
- **Logo "P" square + "Proferto" wordmark:** blue→indigo gradient, wordmark uses gradient text (Space Grotesk 600, 18px). Square rounded ~12px.
- **Top banner ("Prova falas…"):** solid blue `#2563eb`-ish (blue-600) full-width bar, white text, underlined inline link "Qendrën e Ndihmës".
- **Locked (gated) nav items:** slate-400 muted + lock icon on the right, reduced emphasis.

## Radii
- Buttons / inputs: ~10.5px (0.75rem)
- Cards: ~16px (rounded-2xl-ish), banner ~16-20px
- Guide button: 10.5px
- Avatar / logo square: ~12px, avatar circle full

## Component notes
- **Top bar:** height ~64px. Left: hamburger (menu toggle) + gear (settings) + page title (Space Grotesk). Right: "Ndihmë" help (life-buoy icon, violet), global search input with ⌘K hint, notifications bell, theme toggle (sun/moon).
- **Sidebar (overlay at ≤~1024, fixed rail on desktop):** logo + "Plani SOLO" subtitle, user block (avatar initial + name + role "Operator"), "Udhëzuesi" guide row with N/12 badge, then groups KRYESORE / FINANCA / OPERACIONET / BURIMET / SISTEMET, each with SCREAMING muted labels, then "Shkyçu" (logout) at bottom.
- **Nav group header:** uppercase, ~11px, slate-400, letter-spacing wide, bold.
- **Stat cards:** bg slate-100 (#141d31 dark), rounded-2xl, padding ~24px, an icon chip (tinted square) top-left, UPPERCASE label (slate-400, ~12px), big value (Space Grotesk, ~28-32px, slate-900), optional sub-line.
- **Floating config control:** bottom-right pill, indigo bg, rocket icon + "Konfigurimi / N nga 12 hapa".

## Breakpoints (to verify locally)
- Sidebar becomes a fixed rail at ≥ lg (1024px); below that it's a hamburger overlay + slim top bar. (Original could only be observed at 977px CSS width in this environment — treated as tablet/collapsed; desktop rail verified on the clone.)
