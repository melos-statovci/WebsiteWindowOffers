import type {
  Client,
  Project,
  Invoice,
  Payment,
  Note,
  User,
  AppNotification,
  Device,
  LoginEvent,
  PricingSystem,
  CatalogRow,
  CompanyProfile,
} from "@/types";

// ---------------------------------------------------------------------------
// Company / account (fictional — no real PII from the source account)
// ---------------------------------------------------------------------------
export const company: CompanyProfile = {
  name: "Proferto Production sh.p.k.",
  address: "Zona Industriale, 10000 Prishtinë",
  phone: "+383 49 123 456",
  email: "info@proferto-demo.io",
  nui: "811234567",
  vatNo: "330123456",
  postalCode: "10000",
  city: "Prishtinë",
  bank: "ProCredit Bank",
  swift: "MBKOXKPR",
  iban: "XK05 1100 0000 0012 3456",
  marginDefault: 25,
  vatDefault: 18,
};

export const account = {
  plan: "SOLO" as const,
  trialEndsAt: "2026-08-16",
  trialDaysLeft: 11,
};

export const currentUser = {
  name: "Milaim Hasani",
  email: "milaim@proferto-demo.io",
  role: "PRONAR",
  initial: "M",
  sidebarRole: "Operator",
};

export const users: User[] = [
  { id: "u1", name: "Milaim Hasani", email: "milaim@proferto-demo.io", role: "PRONAR" },
];

// ---------------------------------------------------------------------------
// Clients (identity only — financials derived from projects/invoices/payments)
// ---------------------------------------------------------------------------
export const clients: Client[] = [
  { id: "xtlaj7yzg", name: "test", type: "Privat", createdAt: "2026-08-02" },
  {
    id: "arbenkrq1",
    name: "Arben Krasniqi",
    type: "Privat",
    phone: "+383 44 765 432",
    email: "arben.krasniqi@gmail.com",
    address: "Rr. Bill Clinton 24, Prishtinë",
    city: "Prishtinë",
    createdAt: "2026-06-10",
  },
  {
    id: "ndertimic2",
    name: "Ndërtimi Beqiri SH.P.K.",
    type: "Biznes",
    phone: "+383 45 220 110",
    email: "zyra@beqiri-ndertim.com",
    address: "Rr. Ukshin Hoti 10, Ferizaj",
    city: "Ferizaj",
    nui: "810998877",
    createdAt: "2026-05-21",
  },
  {
    id: "lumturije3",
    name: "Lumturije Gashi",
    type: "Privat",
    phone: "+383 49 887 221",
    email: "l.gashi@hotmail.com",
    address: "Lagjja Kalabria, Prishtinë",
    city: "Prishtinë",
    createdAt: "2026-07-14",
  },
  {
    id: "eurohome4",
    name: "Euro Home Interiors",
    type: "Biznes",
    phone: "+383 38 601 550",
    email: "sales@eurohome.io",
    address: "Rr. Nëna Terezë 2, Gjilan",
    city: "Gjilan",
    nui: "811556677",
    createdAt: "2026-04-03",
  },
];

// ---------------------------------------------------------------------------
// Projects / offers (total derived from items via selectors)
// ---------------------------------------------------------------------------
export const projects: Project[] = [
  {
    id: "9534f079-0572-4339-93d1-f9f0693ef26e",
    number: "PRJ-2026-001",
    title: "test",
    clientId: "xtlaj7yzg",
    clientName: "test",
    createdAt: "2026-08-02",
    status: "Pranuar",
    archived: false,
    profileSystem: "Dritare PVC 70 mm (shembull)",
    profileColor: "Bardhë - Bardhë",
    vatRate: 0,
    items: [
      { id: "i1", kind: "Dritare", label: "Dritare", widthMm: 800, heightMm: 1400, qty: 1, unitPrice: 197.95 },
      { id: "i2", kind: "Dritare", label: "Dritare", widthMm: 1000, heightMm: 1200, qty: 1, unitPrice: 100.15 },
      { id: "i3", kind: "Dritare", label: "Dritare", widthMm: 1000, heightMm: 1200, qty: 1, unitPrice: 100.15 },
    ],
  },
  {
    id: "b21c0e10-1111-4a22-8f33-abc0000d1234",
    number: "PRJ-2026-002",
    title: "Banesë 3+1, kati 4",
    clientId: "arbenkrq1",
    clientName: "Arben Krasniqi",
    createdAt: "2026-06-10",
    status: "Pranuar",
    archived: false,
    profileSystem: "Dritare PVC 82 mm premium (shembull)",
    profileColor: "Antracit 7016 - Bardhë",
    vatRate: 0.18,
    items: [
      { id: "a1", kind: "Dritare", label: "Dritare me transom", widthMm: 1600, heightMm: 1500, qty: 4, unitPrice: 222.0 },
      { id: "a2", kind: "Derë", label: "Derë hyrëse", widthMm: 1000, heightMm: 2100, qty: 1, unitPrice: 768.0 },
      { id: "a3", kind: "Rrëshqitëse", label: "Dritare rrëshqitëse HS", widthMm: 2400, heightMm: 2200, qty: 1, unitPrice: 890.0 },
      { id: "a4", kind: "Roletë", label: "Dritare me roletë", widthMm: 1200, heightMm: 1400, qty: 3, unitPrice: 294.0 },
      { id: "a5", kind: "Dritare", label: "Dritare banjo (mat)", widthMm: 600, heightMm: 600, qty: 2, unitPrice: 86.0 },
    ],
  },
  {
    id: "c33d0f20-2222-4b33-9044-def1111e2345",
    number: "PRJ-2026-003",
    title: "Zyra administrative — kati 2",
    clientId: "ndertimic2",
    clientName: "Ndërtimi Beqiri SH.P.K.",
    createdAt: "2026-05-21",
    status: "Dërguar",
    archived: false,
    profileSystem: "Dritare/Derë ALU 70 me urë termike (shembull)",
    profileColor: "Antracit 7016 - Antracit 7016",
    vatRate: 0.18,
    items: [
      { id: "b1", kind: "Dritare", label: "Dritare fikse", widthMm: 2000, heightMm: 1800, qty: 6, unitPrice: 640.0 },
      { id: "b2", kind: "Derë", label: "Derë hyrëse ALU", widthMm: 1100, heightMm: 2200, qty: 2, unitPrice: 1490.25 },
    ],
  },
  {
    id: "d44e1030-3333-4c44-a155-fab2222f3456",
    number: "PRJ-2026-004",
    title: "Shtëpi private — Kalabria",
    clientId: "lumturije3",
    clientName: "Lumturije Gashi",
    createdAt: "2026-07-14",
    status: "Pranuar",
    archived: false,
    profileSystem: "Rrëshqitëse Smart-Slide (shembull)",
    profileColor: "Bardhë - Bardhë",
    vatRate: 0.18,
    items: [
      { id: "c1", kind: "Rrëshqitëse", label: "Rrëshqitëse Smart-Slide", widthMm: 3000, heightMm: 2300, qty: 1, unitPrice: 1601.69 },
    ],
  },
  {
    id: "e55f2040-4444-4d55-b266-0bc3333a4567",
    number: "PRJ-2026-005",
    title: "Rinovim (arkivuar)",
    clientId: "eurohome4",
    clientName: "Euro Home Interiors",
    createdAt: "2026-03-19",
    status: "Refuzuar",
    archived: true,
    profileSystem: "Derë PVC 70 mm (shembull)",
    profileColor: "Bardhë - Bardhë",
    vatRate: 0.18,
    items: [
      { id: "d1", kind: "Derë", label: "Derë banjo", widthMm: 700, heightMm: 2000, qty: 5, unitPrice: 374.58 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export const invoices: Invoice[] = [
  {
    id: "fat-2026-001",
    number: "FAT-2026-001",
    clientId: "arbenkrq1",
    clientName: "Arben Krasniqi",
    reference: "OF-2026-0142",
    issuedAt: "2026-06-12",
    dueAt: "2026-06-27",
    status: "Paguar",
    vatRate: 0.18,
    lines: [
      { description: "Dritare me transom · Salamander 70mm", qty: 4, unitPrice: 222.0 },
      { description: "Derë hyrëse · Door 70mm", qty: 1, unitPrice: 768.0 },
      { description: "Dritare rrëshqitëse HS · bluEvolution 82", qty: 1, unitPrice: 890.0 },
    ],
  },
  {
    id: "fat-2026-002",
    number: "FAT-2026-002",
    clientId: "ndertimic2",
    clientName: "Ndërtimi Beqiri SH.P.K.",
    reference: "OF-2026-0151",
    issuedAt: "2026-06-28",
    dueAt: "2026-07-13",
    status: "Dërguar",
    vatRate: 0.18,
    lines: [
      { description: "Dritare fikse ALU · urë termike", qty: 6, unitPrice: 640.0 },
      { description: "Derë hyrëse ALU", qty: 2, unitPrice: 1490.25 },
    ],
  },
  {
    id: "fat-2026-003",
    number: "FAT-2026-003",
    clientId: "eurohome4",
    clientName: "Euro Home Interiors",
    reference: "OF-2026-0160",
    issuedAt: "2026-07-01",
    dueAt: "2026-07-16",
    status: "Vonesë",
    vatRate: 0.18,
    lines: [
      { description: "Derë banjo PVC 70mm", qty: 5, unitPrice: 442.0 },
      { description: "Montim + transport", qty: 1, unitPrice: 250.0 },
    ],
  },
  {
    id: "fat-2026-004",
    number: "FAT-2026-004",
    clientId: "lumturije3",
    clientName: "Lumturije Gashi",
    reference: "OF-2026-0163",
    issuedAt: "2026-07-15",
    dueAt: "2026-07-30",
    status: "Draft",
    vatRate: 0.18,
    lines: [{ description: "Rrëshqitëse Smart-Slide", qty: 1, unitPrice: 1890.0 }],
  },
];

// ---------------------------------------------------------------------------
// Payments (make derived client/dashboard finances coherent)
// ---------------------------------------------------------------------------
export const payments: Payment[] = [
  { id: "pay1", clientId: "xtlaj7yzg", amount: 398.25, date: "2026-08-03", method: "Para në dorë" },
  { id: "pay2", clientId: "arbenkrq1", invoiceId: "fat-2026-001", amount: 2124.0, date: "2026-06-13", method: "Transfertë bankare" },
  { id: "pay3", clientId: "lumturije3", amount: 1890.0, date: "2026-07-16", method: "Kartelë" },
];

export const notes: Note[] = [
  { id: "n1", clientId: "arbenkrq1", text: "Kërkoi ofertë të re për ballkonin. Preferon ngjyrën antracit.", at: "2026-06-11" },
];

export const notifications: AppNotification[] = [
  { id: "nt1", title: "Ofertë e pranuar", body: "Arben Krasniqi pranoi ofertën OF-2026-0142.", at: "2026-06-11", read: false, href: "/clients/arbenkrq1" },
  { id: "nt2", title: "Faturë në vonesë", body: "FAT-2026-003 (Euro Home Interiors) kaloi afatin e pagesës.", at: "2026-07-17", read: false, href: "/invoices/fat-2026-003" },
  { id: "nt3", title: "Pagesë e re", body: "U regjistrua një pagesë prej €1.890,00 nga Lumturije Gashi.", at: "2026-07-16", read: true, href: "/clients/lumturije3" },
];

// ---------------------------------------------------------------------------
// Security (fully fictional device / login data)
// ---------------------------------------------------------------------------
export const devices: Device[] = [
  { id: "d1", owner: "Milaim Hasani", browser: "Chrome", os: "Mac", ip: "10.0.12.4", lastActive: "05/08/2026, 15:23", loggedInAt: "05/08/2026, 13:34", current: true },
  { id: "d2", owner: "Milaim Hasani", browser: "Chrome", os: "Mac", ip: "10.0.12.4", lastActive: "05/08/2026, 13:33", loggedInAt: "05/08/2026, 13:33" },
  { id: "d3", owner: "Milaim Hasani", browser: "Edge", os: "Windows", ip: "10.0.44.9", lastActive: "02/08/2026, 16:27", loggedInAt: "02/08/2026, 15:51" },
  { id: "d4", owner: "Milaim Hasani", browser: "Safari", os: "iPhone/iPad", ip: "10.0.44.9", lastActive: "02/08/2026, 16:06", loggedInAt: "02/08/2026, 15:34" },
];

export const loginHistory: LoginEvent[] = [
  { id: "l1", kind: "success", who: "Milaim Hasani", device: "Chrome · Mac", ip: "10.0.12.4", at: "05/08/2026, 13:34" },
  { id: "l2", kind: "success", who: "Milaim Hasani", device: "Chrome · Mac", ip: "10.0.12.4", at: "05/08/2026, 13:33" },
  { id: "l3", kind: "failure", who: "milaim@proferto-demo.io", device: "Chrome · Mac", ip: "10.0.12.4", at: "05/08/2026, 13:33" },
  { id: "l4", kind: "failure", who: "milaim@proferto-demo.io", device: "Chrome · Mac", ip: "10.0.12.4", at: "05/08/2026, 13:32" },
  { id: "l5", kind: "success", who: "Milaim Hasani", device: "Edge · Windows", ip: "10.0.44.9", at: "02/08/2026, 15:51" },
];

// ---------------------------------------------------------------------------
// Pricing catalogs (editable seed)
// ---------------------------------------------------------------------------
export const pricingSystems: PricingSystem[] = [
  { id: "s1", name: "Dritare PVC 70 mm (shembull)", brand: "Aluplast", material: "PVC", badges: ["PVC"], category: "Dritare" },
  { id: "s2", name: "Dritare PVC 82 mm premium (shembull)", brand: "Salamander", material: "PVC", badges: ["PVC"], category: "Dritare" },
  { id: "s3", name: "Derë PVC 70 mm (shembull)", brand: "Aluplast", material: "PVC", badges: ["PVC"], category: "Dyer" },
  { id: "s4", name: "Rrëshqitëse Smart-Slide (shembull)", brand: "Aluplast", material: "PVC", badges: ["PVC", "SMART"], category: "Rrëshq." },
  { id: "s5", name: "Rrëshqitëse HST 85 Lift & Slide (shembull)", brand: "Salamander", material: "PVC", badges: ["PVC", "HST"], category: "Rrëshq." },
  { id: "s6", name: "Dritare/Derë ALU 70 me urë termike (shembull)", brand: "Aluplast", material: "ALU-TERMIK", badges: ["ALU-TERMIK"], category: "Dritare" },
];

export const profilePriceRows = [
  { id: "pp1", profile: "Ram (Kasa)", code: "RAM-70", white: 6.2, whiteColor: 8.1, colorColor: 9.4 },
  { id: "pp2", profile: "Krah", code: "KRH-70", white: 7.0, whiteColor: 9.2, colorColor: 10.8 },
  { id: "pp3", profile: "T-Shtyllë", code: "TSH-70", white: 7.6, whiteColor: 9.9, colorColor: 11.5 },
  { id: "pp4", profile: "Adapter", code: "ADP-70", white: 3.1, whiteColor: 4.0, colorColor: 4.7 },
];

export const metals: CatalogRow[] = [
  { id: "m1", name: "Metal për PVC 70mm", brand: "Metal Standard", price: 3.2 },
  { id: "m2", name: "Metal për PVC 82mm", brand: "Metal Standard", price: 3.8 },
  { id: "m3", name: "Metal për Dyer 70mm", brand: "Metal Standard", price: 4.5 },
];

export const armingRows = [
  { id: "ar1", component: "Armim Ram", code: "AR-RAM", price: 3.2 },
  { id: "ar2", component: "Armim Krah", code: "AR-KRH", price: 3.6 },
  { id: "ar3", component: "Armim T-Shtyllë", code: "AR-TSH", price: 4.1 },
  { id: "ar4", component: "Armim Adapter", code: "AR-ADP", price: 1.9 },
];

export const glass: CatalogRow[] = [
  { id: "g1", name: "Dopjo Low-E 4-16-4", brand: "Guardian", extra: "Termoizolues, Ug 1.1", price: 34.0, photo: true },
  { id: "g2", name: "Trepjo Low-E 4-14-4-14-4", brand: "Sisecam", extra: "Ug 0.6, akustik", price: 58.5, photo: true },
];

export const panels: CatalogRow[] = [
  { id: "p1", name: "Panel dekorativ Klasik", brand: "Panel Brand A", price: 120.0, photo: true },
  { id: "p2", name: "Panel modern i lëmuar", brand: "Panel Brand B", price: 165.0, photo: true },
];

export const expansions = [
  { id: "e1", name: "Shtesë 20mm", brand: "Expansion Brand A", widthMm: 20, price: 2.4 },
  { id: "e2", name: "Shtesë 40mm", brand: "Expansion Brand A", widthMm: 40, price: 3.6 },
];

export const roletaVersions = [
  { id: "r1", name: "E Bardhë", pricePerM2: 45.0 },
  { id: "r2", name: "Antracit", pricePerM2: 52.0 },
];

export const doorModels = [
  { id: "dm1", name: "Model Lira", mode: "FIKS" as const, basePrice: 620.0 },
  { id: "dm2", name: "Model Onyx", mode: "TABELË" as const, basePrice: 780.0 },
  { id: "dm3", name: "Model Terra", mode: "FIKS" as const, basePrice: 540.0 },
];

export const accessoryParams: Record<string, string> = {
  "Dorezë (copë) — vetëm dritare": "4.50",
  "Llajsne bardhë (€/m)": "0.80",
  "Llajsne color (€/m)": "1.20",
  "Lidhëse T-shtylle (copë)": "2.10",
  "Pragu (copë)": "18.00",
  "Doreza (copë)": "12.50",
  "Bravë / mekanizmi i mbylljes (copë)": "22.00",
  "Menteshat (për copë)": "3.40",
};

export const productionParams: Record<string, string> = {
  "Humbja e saldimit në çmim (%)": "3",
  "Humbja e prerjes ALU (%)": "",
  "Gjatësia e profilit (m)": "6.5",
  "Gjatësia e metalit (m)": "6",
  "Shtesa e saldimit për skaj (mm)": "3",
  "Trashësia e diskut të sharrës (mm)": "4",
  "Pastrim skajesh për shufër (mm)": "10",
  "Mbetja min. e shfrytëzueshme (mm)": "300",
  "Tarifa e punës (€/h)": "12",
  "Minuta pune për element (min)": "25",
  "Shpenzimet e përgjithshme (%)": "8",
};

// Sample offer used for the "Dizajni i Ofertës" PDF previews
export const sampleOffer = {
  number: "OF-2026-0142",
  date: "10.06.2026",
  validUntil: "20.06.2026",
  client: { name: "Arben Krasniqi", address: "Rr. Bill Clinton 24, Prishtinë", phone: "+383 44 765 432" },
  project: "Banesë 3+1, kati 4",
  positions: 5,
  pieces: 11,
  subtotal: 3600.0,
  vat: 648.0,
  total: 4248.0,
};
