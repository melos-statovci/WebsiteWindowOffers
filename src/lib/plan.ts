import type { PlanTier } from "./nav";

export interface GatedInfo {
  title: string;
  plan: PlanTier;
  features: string[];
}

export const BIZNES_FEATURES = [
  "Gjithçka nga plani SOLO",
  "Stoku me optimizim automatik",
  "Prodhimi",
  "Moduli i Financave (fitimi real dhe shpenzimet)",
  "Regjistri i plotë i pagesave",
  "3 dizajne ofertash",
  "Deri në 3 përdorues",
];

export const FABRIKA_FEATURES = [
  "Gjithçka nga plani BIZNES",
  "Menaxhimi i punëtorëve",
  "Menaxhimi i aseteve",
  "Menaxhimi i dokumenteve",
  "GPS — gjurmimi i flotës (shtesë për automjet)",
  "6 dizajne ofertash",
  "Deri në 8 përdorues",
  "Mbështetje prioritare",
];

// Maps a gated route to its upgrade-wall content.
export const gatedRoutes: Record<string, GatedInfo> = {
  "/finance": { title: "Financat", plan: "BIZNES", features: BIZNES_FEATURES },
  "/jobs": { title: "Prodhimi", plan: "BIZNES", features: BIZNES_FEATURES },
  "/stock": { title: "Stoku", plan: "BIZNES", features: BIZNES_FEATURES },
  "/monitoring": { title: "Monitorimi", plan: "BIZNES", features: BIZNES_FEATURES },
  "/workers": { title: "Punëtorët", plan: "FABRIKA", features: FABRIKA_FEATURES },
  "/assets": { title: "Asetet", plan: "FABRIKA", features: FABRIKA_FEATURES },
  "/documents": { title: "Dokumentet", plan: "FABRIKA", features: FABRIKA_FEATURES },
};

export const plans = [
  {
    tier: "SOLO" as const,
    name: "SOLO",
    tagline: "Për zejtarë dhe instalues të pavarur",
    monthly: 12.5,
    monthlyStandard: 20.83,
    yearly: 150,
    current: true,
  },
  {
    tier: "BIZNES" as const,
    name: "BIZNES",
    tagline: "Për kompani në rritje",
    monthly: 29.17,
    monthlyStandard: 40.83,
    yearly: 350,
  },
  {
    tier: "FABRIKA" as const,
    name: "FABRIKA",
    tagline: "Për fabrika dhe prodhim serioz",
    monthly: 45.83,
    monthlyStandard: 65.83,
    yearly: 550,
  },
  {
    tier: "ENTERPRISE" as const,
    name: "ENTERPRISE",
    tagline: "Për kompani të mëdha me ekipe në terren",
    monthly: 62.5,
    monthlyStandard: 91.67,
    yearly: 750,
  },
];

// Offer PDF design templates
export const offerDesigns = [
  { id: "klasik", name: "Klasik", plan: "SOLO", active: true },
  { id: "minimal", name: "Minimal", plan: "BIZNES", active: false },
  { id: "marke", name: "Markë", plan: "BIZNES", active: false },
  { id: "rrjeti", name: "Rrjeti Teknik", plan: "FABRIKA", active: false },
  { id: "llogaria", name: "Llogaria", plan: "FABRIKA", active: false },
  { id: "skede", name: "Skedë Teknike", plan: "FABRIKA", active: false },
];

// Config guide steps
export const guideGroups = [
  {
    label: "KOMPANIA",
    steps: ["Profili i kompanisë dhe logoja", "Dizajni i ofertës"],
  },
  {
    label: "ÇMIMET & SISTEMET",
    steps: [
      "Brendet e profileve",
      "Sistemet e profileve",
      "Çmimet e profileve dhe armimi",
      "Mekanizmat dhe hardueri",
      "Xhamat, panelet dhe dyert e hyrjes",
      "Shtesat, aksesorët dhe roletat",
      "Parametrat e prodhimit",
    ],
  },
  {
    label: "PUNA E PARË",
    steps: ["Klienti dhe projekti i parë", "Oferta e parë"],
  },
];

export const faqItems = [
  "Si krijoj një ofertë të re?",
  "Si i vendos çmimet e profileve?",
  "Ku e ndryshoj gjatësinë e shufrës së profilit?",
  "Ku i vendos përqindjen e fitimit dhe TVSH-në?",
  "Si e ndryshoj dizajnin e ofertës / PDF-së?",
  "Si shtoj një përdorues të ri në kompani?",
  "Si funksionon periudha e provës dhe si e rinovoj abonimin?",
  "Si i menaxhoj klientët dhe pagesat?",
  "Çfarë bëjnë modulet Prodhimi dhe Stoku?",
  "Si e regjistroj mallin që kam tashmë në fabrikë?",
];
