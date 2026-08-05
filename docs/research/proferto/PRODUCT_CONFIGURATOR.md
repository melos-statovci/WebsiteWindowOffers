# Proferto — "Shto produkt" Window Configurator (directly observed 2026-08-05)

The real "add product" is a **full parametric window/door configurator**, NOT a form modal.
It IS the content of the Produkti tab: a product LIST (when items exist) that switches to the
CONFIGURATOR when you click a product (edit) or "+" (add). "Shto në Ofertë" adds/updates the item.

## Layout
- Left: normal app sidebar (desktop) — configurator has its own top strip (X "Dil nga konfiguratori",
  undo "Kthehu mbrapa", tabs Detajet/Produkti/Përmbledhje) and a bottom status bar
  "● SYSTEM ACTIVE · PRECISION: 1.0MM · © 2026 PROFERTO".
- Produkti content = two columns:
  - **Top: window-type toolbar** (icon buttons) — selects the model geometry.
  - **Left panel**: product-type dropdown + 3 sub-tabs + fields.
  - **Right panel (main)**: live technical drawing + material chips + quantity + live price + Shto në Ofertë.

## Window-type toolbar (19)
Ndërto vetë modelin (custom/+), **Njëshe**, **Dyshe Vertikale**, **Treshe Vertikale**, **Katërshe Vertikale**,
Transom Lart (1-1)(1-2)(2-2)(1-3)(3-3), Transom Poshtë (1-1)(2-1)(2-2)(3-1)(3-3),
Trekëndësh, Trapez, Pesëkëndësh, Hark.

## Product-type dropdown (icons)
Dritare (window), Derë Hyrje (entrance door), Derë (door), Rreshqitëse (sliding), Roletë (roller shutter).

## Sub-tabs
- **Përmasat**: GJERËSIA (W) mm, LARTËSIA (H) mm · PROFILI & NGJYRA (SISTEMI I PROFILIT dropdown
  [s1 Dritare PVC 70 (Aluplast), s2 Dritare PVC 82 premium (Salamander), as1 Dritare/Derë ALU 70 (Aluplast)],
  NGJYRA E PROFILIT [Bardhë-Bardhë / Bardhë-Color / Color-Color]).
- **Shtesa & Roleta**: SHTESA list + "Shto shtesë" (extend profile on a side; empty state
  "Nuk ka shtesa. Kliko 'Shto shtesë' për të zgjeruar profilin anash.") · AKTIVIZO ROLETËN toggle.
- **Mekanizmi & Xhami**: SISTEMI I MEKANIZMIT (Roto NX…), LLOJI I XHAMIT
  [Dopjo Xham Standard (Guardian) / Trepjo Xham Low-E (Guardian)], PËRSHKRIMI I XHAMIT (optional,
  placeholder "4mm Float + 16mm Argon + 4mm Low-E"), DETAJET E MATERIALEVE (expandable breakdown).

## Live preview (right)
SVG technical drawing: frame + N sashes + mullions + glass with diagonal opening indicator +
dimension lines (overall W bottom, H right, and per-sash widths bottom). Updates live with
type + dimensions.

## Material chips — CONFIRMED formulas (face=55mm ram, 42mm mullion)
For N vertical panes at W×H (mm):
- **PROFIL RAM** (frame perimeter) = 2·(W+H)  → 1000×1200 = 4.40 m ✓
- glass pane: paneH = H − 2·55; total glass width = W − 2·55 − (N−1)·42; paneW = that/N
- **XHAM** (glass area) = N·paneW·paneH  → single 0.97 m² ✓ ; dyshe 0.92 m² ✓
- **LLAJSNE** (glazing bead = Σ pane perimeters) = N·2·(paneW+paneH) → 3.96 ✓ ; dyshe 6.06 ✓
- **T-SHTYLLË** (vertical mullions) = (N−1)·H → dyshe 1.20 m ✓
(Transom = horizontal divider of length W creating rows; analogous.)

## Live price (observed)
- Njëshe 1000×1200, PVC70/white/RotoNX/Dopjo = **€100.15**
- Dyshe Vertikale 1000×1200 (same) = **€124.96**  (adds T-shtyllë + 2nd sash + more llajsne)
Exact production coefficients are NOT observable, so the local calc uses the pricing-store values
(ram/krah/t-shtyllë €/m from profilePriceRows by color, glass €/m², llajsne €/m, arming €/m,
mechanism + handle per sash) tuned so the reference single window ≈ €100. Documented as approximated.

## Quantity + add
SASIA − N + stepper · ÇMIMI I PËRLLOGARITUR (live) · **Shto në Ofertë** (adds configured item to offer;
reopening a product loads its full config for editing).
