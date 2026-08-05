# Proferto — Per-Page Specs (from authenticated inspection 2026-08-05)

> Language: Albanian. Currency: EUR (`€1,234.56` and `1.234,00 €` both appear; list uses `€398.25`).
> Env limitation: original only observable at **977px** CSS viewport (fixed). Desktop sidebar-rail + true mobile verified on the clone.
> All PII (real emails/IPs/device history/company "Milaim") is replaced with fictional mock data in the clone.

## Global shell
- **Top banner** (blue `#2563eb`, white text, full width): clock icon + "Prova falas: edhe 11 ditë. Proferto është në fazë lansimi dhe përmirësohet vazhdimisht — mund të ndodhin ndërprerje të shkurtra. Për problem ose sugjerim, hapni **Qendrën e Ndihmës**." (dismissible; inline underlined link opens Help drawer).
- **Top bar** (~64px, bg slate-100/blur): LEFT = hamburger (toggle sidebar) + gear (→settings) + page title (Space Grotesk ~20px). RIGHT = "Ndihmë" (life-buoy, violet) + search input ("Kërko…" + ⌘K badge) + bell (notifications) + theme toggle (sun/moon).
- **Sidebar** (fixed rail on desktop ≥1024; off-canvas overlay + hamburger below): logo "P" gradient square + "Proferto" gradient wordmark + "Plani SOLO"; user block (avatar initial "M" + "Milaim Hasani" + "Operator"); "Udhëzuesi" guide row w/ `12/12` badge (violet, bg `#1a1f40`); groups:
  - **KRYESORE**: Dashboard (grid icon), Projektet (folder icon), Klientët (users icon)
  - **FINANCA**: Faturat (receipt), Financat 🔒(bar-chart)
  - **OPERACIONET**: Prodhimi 🔒(box), Stoku 🔒(layers), Monitorimi 🔒(activity)
  - **BURIMET**: Punëtorët 🔒(user), Asetet 🔒(truck), Dokumentet 🔒(folder)
  - **SISTEMET**: Çmimet & Sistemet (tag/euro), Siguria (shield), Cilësimet (gear)
  - **Shkyçu** (logout, bottom).
  Active item: text `#93c5fd`, bg `#15233f`. Locked items: muted + lock icon at right.
- **Floating config control** (bottom-right pill, indigo): rocket + "Konfigurimi / 12 nga 12 hapa" → opens config guide drawer.
- **Group header**: uppercase ~11px slate-400 bold wide-tracking.

## /dashboard
- Onboarding banner card (dark, rounded-2xl): rocket icon chip; "Konfigurimi i Proferto-s" + `12/12 hapa` badge; "Hapi i radhës: **Siguria e llogarisë** — Në llogarinë tuaj rrinë çmimet, klientët dhe financat — një hap i dytë verifikimi ia vlen."; buttons "Vazhdo" (primary), "Hapma faqen →" (ghost); full progress bar (violet gradient).
- **KPI cards** (2-col grid on desktop, stack mobile; bg slate-100, rounded-2xl, icon chip top-left, UPPERCASE label, big value Space Grotesk):
  - OFERTAT KËTË MUAJ = **1** (doc icon, cyan)
  - PUNË NË PRODHIM = **1** / "0 përfunduar" (wrench icon, cyan)
  - TË HYRA (PRANUAR) = **€398.25** (wallet icon, emerald)
  - Fitimi = **GATED** "Përditëso në PRO" (grid icon, muted — locked card variant)
  - TË PRANUARA = **1** / €398.25
  - NË PRITJE = **0** / €0.00
  - BORXHI I KLIENTËVE = **€0.00** / "0 oferta"
  - SHPENZIME = **€0.00**
- **Chart card**: "Rrjedha financiare (6 muajt e fundit)" — line chart, X = Mar…Aug, Y = 0/150/300/450/600, dashed grid, 3 series legend: Arkëtuar (emerald), Shpenzime (rose), Të hyra (blue). Data near-zero.
- **Two panels**: "Oferta për ndjekje" (bell) empty "Asnjë ofertë në ndjekje." · "Borxhe të hapura" (clock) empty "Nuk ka borxhe të hapura."
- **Ofertat e fundit**: row "test / OFERTA-2024001 · 8/2/2026 / €398.25".
- **CRM & Klientët** gated teaser: "Kaloni në PRO për menaxhim klientësh."

## /projects
- Header "Projektet" + "N projekte". Buttons: "Arkivi" (outline, archive icon — toggles archived list, no URL change), "Projekt i ri" (primary +).
- Search "Kërko numër, titull ose klient…".
- Table: `NUMRI | PROJEKTI | KLIENTI | KRIJUAR | SHUMA TOTALE`(right). Number bold. Row → `/projects/{id}/configure`.
- Row: `PRJ-2026-001 · test · test · 8/2/2026 · €398.25`.

## /projects/[projectId]/configure  (projectId = UUID)
- Distinct chrome: NO sidebar. Top: dark pill with X (close→/projects) + undo; right: "Edit" + "+" (on Produkti) / print icon (on Përmbledhje).
- Centered segmented tabs (state-only): **Detajet · Produkti · Përmbledhje** (active = white pill).
- **Detajet**: "Kthehu te Oferta (3)"; KLIENTI (avatar+test); PROFILI — "Sistemi i profilit" = "Dritare PVC 70 mm (shembull)", "Ngjyra e profilit" = "Bardhë - Bardhë"; "Vazhdo Konfigurimin" primary.
- **Produkti**: list of product cards — thumbnail (window schematic SVG) + "Dritare" + "800 × 1400 mm · 1 copë" + price bold + ⋮ menu. Items: 800×1400 €197.95; 1000×1200 €100.15; 1000×1200 €100.15.
- **Përmbledhje**: card "Përmbledhja e Ofertës / 3 pozicione · test" rows Totali €398.25 / TVSH (0%) +€0.00 / **Totali përfundimtar €398.25** (highlighted). OPSIONET toggles: Marzha, Zbritje, TVSH, Montimi, Demontimi, Transporti (all off).

## /clients
- Header "Klientët" + "N klientë · kliko një rresht për të hapur kartelën". Button "Shto Klient" (primary +).
- Search "Kërko klient: emri, telefoni, email, NUI…". Filter dropdown (Të gjithë / Privat / Biznes), Sort dropdown (Emri (A-Z) / Emri (Z-A) / Më të rejat).
- Table: `KLIENTI | LLOJI | KONTAKTI | ADRESA` + actions. Row: avatar initial + name + type badge ("Privat"/"Biznes") + "—" + "—" + [Hap kartelën ›] + edit(pencil)/delete(trash) icons.

## /clients/[clientId]  (clientId = short nanoid)
- Back "← Kthehu te Klientët".
- Header card: avatar + name + type badge; right metrics VLERA TOTALE / PAGUAR(green) / BORXHI(rose); "Shto pagesë" primary +.
- Tabs (state-only): **Përmbledhje · Projektet [n] · Ofertat [n] · Pagesat [n] · Prodhimi · Dokumentet · Shënime** (icons + count badges).
- Përmbledhje: 2-col — LEFT "Informacioni" (TELEFONI/EMAIL/ADRESA w/ icons) · RIGHT "Përmbledhje financiare" rows: Oferta gjithsej, Të pranuara (n·€), Të refuzuara, Paguar(green), Borxh i hapur(rose).

## /invoices
- Header "Faturat" + "Krijoni dhe menaxhoni faturat e klientëve" + "Faturë e re" primary +.
- 3 status tiles: TË PAPAGUARA (amber $ icon), TË PAGUARA (emerald ✓), NË VONESË (red ⚠) — each "0.00 EUR".
- Search "Kërko faturë, klient ose referencë…" + status `<select>` (Të gjitha statuset / Draft / Dërguar / Paguar / Vonesë / Anuluar).
- Empty state: receipt icon, "Asnjë faturë ende", "Krijoni një faturë nga një ofertë e pranuar ose nga e para.", "Faturë e re".
- **Clone adds mock invoices** to populate the list + tiles, and a mock detail route.

## /invoices/[invoiceId]  (INFERRED — not observable on production; clearly a local mock view)
- Build a realistic invoice detail: header (nr, status badge, client, dates), line items table, totals (Nëntotali/TVSH/Total), payment info, actions (mock PDF/print/"shëno të paguar").

## /pricing  (tab reflected in `?tab=`; back/fwd works; unknown tab → default "Sistemet")
Header "Çmimet & Sistemet" + "Sistemet e profileve, materialet, produktet dhe parametrat — një vend i vetëm për çdo çmim." Tab bar (10) + "Ruaj Ndryshimet" (primary, right). Each tab has a 1-line description.
- **Sistemet** (default, no query): master-detail. LEFT: search + chips (Të gjitha/Dritare/Dyer/Rrëshq.) + system list [Dritare PVC 70 mm (shembull)·Aluplast·PVC; Dritare PVC 82 mm premium·Salamander·PVC; Derë PVC 70 mm·Aluplast·PVC; Rrëshqitëse Smart-Slide·Aluplast·PVC·SMART; Rrëshqitëse HST 85·Salamander·PVC·HST; Dritare/Derë ALU 70 me urë termike·Aluplast·ALU-TERMIK] + [+ Shto][Shablloni]. RIGHT: BRENDET E PROFILEVE (2)+Shto brend; TË DHËNAT E SISTEMIT (EMRI, BRENDI, MATERIALI, METALI, THELLËSIA, XHAMI MAKS., PËRDORIMI checkboxes, LLOJI I RRËSHQITËSES, SET/KRAH €, SHINA €/m); ÇMIMET E PROFILEVE (€/M) table cols `PROFILI|KODI|BARDHË|BARDHË-COLOR|COLOR-COLOR` rows Ram(Kasa)/Krah/T-Shtyllë/Adapter; GJEOMETRIA E PROFILIT (MM) fields.
- **Metalet** (`?tab=metals`): master-detail. List: Metal për PVC 70mm/82mm/Dyer 70mm (Metal Standard) + Shto Metal. RIGHT: BRENDET E METALIT(1); TË DHËNAT (EMRI, BRENDI); ÇMIMET E ARMIMIT (€/M) `KOMPONENTI|KODI|€/M` rows Armim Ram/Krah/T-Shtyllë/Adapter.
- **Mekanizmat** (`?tab=mechanisms`): List Roto NX (Roto) + Shto Mekanizëm. RIGHT: BRENDET(2) Roto/Vorne; MATRICA SINGLE (H\W 40/60/80/105/130 × rows 60/80/100/140/180/200/230 → €); MATRICA DOUBLE (W 80/120/160/200/240); HARDUERI I RRËSHQITËSES (Set €, Shina €/m).
- **Xhamat** (`?tab=glass`): full-width table "LLOJET E XHAMAVE (n)" + [Importo Excel][Shto Xham]. Cols `FOTO|EMRI|BRENDI|PËRSHKRIMI (SHFAQET NË OFERTË)|€/M²`. Brands Guardian/Sisecam. BRENDET E XHAMIT(2).
- **Panelet** (`?tab=door-panels`): table "PANELET E DYERVE (n)" + Shto Panel. Cols `FOTO|EMRI|BRENDI|€/M²`. Panel Brand A/B.
- **Shtesat** (`?tab=expansion-profiles`): table "PROFILET ZGJERUESE / SHTESAT (n)" + Shto Shtesë. Cols `EMRI|BRENDI|GJERËSIA (MM)|€/M`.
- **Aksesorët** (`?tab=accessories`): labeled €-input form. AKSESORËT E PËRBASHKËT (Dorezë copë, Llajsne bardhë €/m, Llajsne color €/m, Lidhëse T-shtylle copë) + AKSESORËT E DERËS (Pragu, Doreza, Bravë, Menteshat).
- **Parametrat** (`?tab=production`): production settings form. TË PËRGJITHSHME (Humbja e saldimit %, Humbja e prerjes ALU %, Gjatësia e profilit m, Gjatësia e metalit m) + PARAMETRAT E PRODHIMIT (many mm/€/%/min inputs: shtesa saldimit, trashësia diskut, pastrim skajesh, mbetja min, hapësira xhamit, fytyra krahut, distanca armimit, rrjeta prerjes, faturim min xhami m², konsumablet %, tarifa pune €/h, minuta pune/element, minuta shtesë/m², shpenzimet e përgjithshme %).
- **Roletat** (`?tab=roleta`): VERSIONET E ROLETËS (E Bardhë €/m², Antracit €/m²) + MADHËSIA E KUTISË (MM)+Shto Madhësi + PJESËT E ROLETËS (Motorr €, Kutia €/m, Shina Udhëzuese €/m).
- **Dyer të Hyrjes** (`?tab=doors`, label "Dyer të Hymjes"): "MODELET E DYERVE TË HYRJES"+Shto Model. Model cards: NDËRRO FOTON, FIKS/TABELË toggle, ÇMIMI BAZË €. + toggle "Shfaq foton e modelit në ofertë".

## /security  (rebuild with FICTIONAL device/login/IP data)
- Onboarding guide strip (HAP OPSIONAL · UDHËZUESI). Heading "Siguria" + "Kush kyçet, nga cilat pajisje, dhe çdo qasje e support-it — transparencë e plotë."
- **Qasja e support-it**: desc; status "E mbyllur — të dhënat i shihni vetëm ju"; button "Hape për 24 orë".
- **Verifikimi në dy hapa (2FA)**: "Joaktiv" badge; desc; "Aktivizo 2FA".
- **Fjalëkalimi**: desc; "Ndrysho fjalëkalimin".
- **Pajisjet e kyçura (n)** + "Dil nga të gjitha të tjerat". Device cards: name, "Kjo pajisje" badge, `Browser · OS · IP`, `aktive:… · kyçur:…`, "Dil".
- **Historiku i kyçjeve**: entries "Kyçje e suksesshme/dështuar" + who + `device · ip · time`.
- **Transparenca e support-it**: "✓ Asnjë qasje e support-it deri më sot…".
- Clone: all actions are harmless local simulations (toasts).

## /settings  (state-only panels; URL stays /settings). Desktop = 2-col (secondary KOMPANIA sidebar + panel). Mobile/≤977 = menu list → drill-down w/ back arrow "← Cilësimet".
Menu group **KOMPANIA**: Profili i Kompanisë (building), Dizajni i Ofertës (palette), Përdoruesit (users), Abonimi (card), Backup & Eksport (download). Each row icon+label+chevron.
- **Profili i Kompanisë**: LOGO (upload + "FSHIJ LOGON"); "Logot e profileve / sistemeve" LOGO 1/2/3 slots; fields EMRI I KOMPANISË, ADRESA, TELEFONI, EMAIL ZYRTAR, MARZHA DEFAULT %, TVSH DEFAULT %; "Të dhënat e faturimit" (NUI, NUMRI I TVSH-SË, KODI POSTAR, QYTETI, BANKA, SWIFT/BIC, IBAN) + "Ruaj"; "Tekstet & pagesa" note + "Hap seksionin"; "Ruaj Ndryshimet".
- **Dizajni i Ofertës**: "Plani juaj (SOLO) ju lejon të zgjidhni nga 1 dizajn nga gjithsej 6." 6 template cards w/ A4 preview thumbnail + name + plan badge + Shiko: Klasik (AKTIV/SOLO), Minimal (BIZNES), Markë (BIZNES), Rrjeti Teknik (FABRIKA), Llogaria (FABRIKA), Skedë Teknike (FABRIKA). "Tekstet e Ofertës" section (KUSHTET, MESAZHI I FALENDERIMIT, TË DHËNAT E PAGESËS, DETAJET E BANKËS, toggle "Shfaq të dhënat e pagesës", "Ruaj tekstet"). Sample offer for previews: OF-2026-0142, client "Arben Krasniqi, Rr. Bill Clinton 24, Prishtinë", 5 positions, Nëntotali 3.600,00 € / TVSH(18%) +648,00 € / TOTALI 4.248,00 €.
- **Përdoruesit**: "Përdoruesit e kompanisë / 1 / 1 ulëse · Plani SOLO" + "Shto Përdorues" (disabled); warning "Keni arritur limitin e përdoruesve për planin tuaj (Plani SOLO: 1)…"; table EMRI|EMAIL|ROLI → (fictional) name / email / PRONAR.
- **Abonimi**: "PLANI AKTUAL / PROVË / SOLO / Për zejtarë dhe instalues të pavarur / Prova mbaron më 08/16/2026 — edhe 11 ditë". Stepper 1 Plani/2 Faturimi/3 Pagesa/4 Konfirmimi. Billing toggle Mujor / Vjetor −17%. Plan cards: SOLO (AKTUAL, €12.50/mo, €150/yr), BIZNES (€29.17/mo, €350/yr), FABRIKA (€45.83/mo, €550/yr), ENTERPRISE (€62.50/mo, €750/yr). "Vazhdo". Contact info@arios.systems.
- **Backup & Eksport**: "Backup i të Dhënave" + desc + "Shkarko Backup"; "Rikthimi (Restore)" + desc + "Ngarko Backup".

## Gated modules (upgrade wall — reusable component)
Centered card: lock icon chip; H1 "Ky modul nuk është i përfshirë në planin tuaj"; "Për ta përdorur këtë funksion, kaloni në planin **{PLAN}**."; feature card "Plani {PLAN} përfshin:" (sparkle icon + green-check list); "Kërko përmirësim" primary (chat icon).
- **BIZNES** (`/finance`, `/jobs`, `/stock`, `/monitoring`) features: Gjithçka nga plani SOLO · Stoku me optimizim automatik · Prodhimi · Moduli i Financave (fitimi real dhe shpenzimet) · Regjistri i plotë i pagesave · 3 dizajne ofertash · Deri në 3 përdorues.
- **FABRIKA** (`/workers`, `/assets`, `/documents`) features: Gjithçka nga plani BIZNES · Menaxhimi i punëtorëve · Menaxhimi i aseteve · Menaxhimi i dokumenteve · GPS — gjurmimi i flotës (shtesë për automjet) · 6 dizajne ofertash · Deri në 8 përdorues · Mbështetje prioritare.
Page titles per route (top bar): Financat, Prodhimi, Stoku, Monitorimi, Punëtorët, Asetet, Dokumentet.

## Overlays
- **Help drawer** (right slide-over): blue gradient header (life-buoy + "Qendra e Ndihmës / Jemi këtu për ju" + X); tabs "Pyetjet e shpeshta" / "Na kontaktoni"; search "Kërko një pyetje…"; FAQ accordion (10 Qs listed in notes); footer "Orari i mbështetjes / Çdo ditë, përfshirë të dielën · 08:00 – 00:00".
- **Notifications** (dropdown under bell): "Njoftimet" + X; empty "Asnjë njoftim. Gjithçka në rregull.".
- **Search palette** (⌘K): command palette; searches local pages + projects/clients/invoices.
- **Config guide drawer** (right slide-over): purple gradient header (rocket + "Udhëzuesi i konfigurimit / Gjithçka gati" + X + progress bar); groups KOMPANIA (2) / ÇMIMET & SISTEMET (7) / PUNA E PARË (2) w/ checked accordion steps (12 total); footer "Fshihe deri nesër · Mos e shfaq më · Progresi ruhet vetë".
- **FAQ questions**: Si krijoj një ofertë të re? · Si i vendos çmimet e profileve? · Ku e ndryshoj gjatësinë e shufrës së profilit? · Ku i vendos përqindjen e fitimit dhe TVSH-në? · Si e ndryshoj dizajnin e ofertës / PDF-së? · Si shtoj një përdorues të ri në kompani? · Si funksionon periudha e provës dhe si e rinovoj abonimin? · Si i menaxhoj klientët dhe pagesat? · Çfarë bëjnë modulet Prodhimi dhe Stoku? · Si e regjistroj mallin që kam tashmë në fabrikë?
