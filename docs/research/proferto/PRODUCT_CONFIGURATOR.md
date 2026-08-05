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

## SECOND PASS — interactions & per-type variations (directly observed)

### Product selection is step 0
Empty Produkti → big "+" → popup **"ZGJIDH PRODUKTIN"**: Dritare · Derë Hyrje · Derë ·
Rreshqitëse · Roletë. Picking one opens a **type-specific** configurator. The product
dropdown at the top switches type in place.

### Clicking a window/sliding pane toggles its opening
Default panes are **FIKS** (glass only → materials RAM/LLAJSNE/XHAM, no hardware).
Clicking a pane makes it **hapëse** and cycles the opening symbol (majtas/djathtas/kip,
drawn with red+blue dashed indicators). An opening pane ADDS: **PROFIL KRAH** (sash
perimeter), **MEKANIZËM SINGLE** (per opening sash, size-dependent), **DOREZA** (handle,
per opening sash). Example (1000×2500 double): fixed €220.95 → one pane opened €330.28.

### Shtesa flow
"Shto shtesë" → menu **"KU TA SHTONI?"**: Lart / Poshtë / Majtas / Djathtas → adds a
row `SIDE | [width] MM | ✕` (side fixed as a label, width editable, removable).

### Per-type panels
- **Dritare**: window model toolbar (19), glass (XHAM), window+ALU systems, per-pane opening.
- **Derë Hyrje / Derë**: door model toolbar (5), taller default (H≈2500), door-only systems
  (Derë PVC 70, ALU 70). Extra fields: **MBISHKRIM MANUAL (OPSIONAL)** price override
  (0 = auto), **MODELI I DERËS** (ARIES / CARINA / CONNA), **PËRBËRJA E KRAHUT**
  (Panel i plotë / Krah masiv  vs  Gjysmë xham|Me xham). Material **PANEL m²** (not XHAM).
- **Rreshqitëse**: glass (XHAM) + T-SHTYLLË (meeting rail), sliding systems (Smart-Slide,
  HST 85) + window systems, MBISHKRIM MANUAL, per-pane opening, own model toolbar.
- **Roletë**: minimal — only GJERËSIA/LARTËSIA, no sub-tabs, no systems. Material **KUTIA**.

### Material chip vocabulary
PROFIL RAM · PROFIL KRAH · T-SHTYLLË · LLAJSNE · XHAM (windows/sliding) / PANEL (doors) /
KUTIA (roleta) · MEKANIZËM SINGLE|DOUBLE (count) · DOREZA (count).
