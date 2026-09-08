export type PlanTier = "STANDARD";

export const STANDARD_PLAN: PlanTier = "STANDARD";
export const STANDARD_PLAN_NAME = "Kornizo Standard";

// Launch has one real product plan. Keep a typed list so future plans can be
// introduced deliberately by expanding this source and a matching migration.
export const PLAN_TIERS: PlanTier[] = [STANDARD_PLAN];

/** True if `current` includes everything gated at `required` (rank >=). */
export function planIncludes(current: PlanTier, required: PlanTier): boolean {
  return current === required;
}

/** Narrow an arbitrary string to the launch plan, defaulting to Standard. */
export function asPlanTier(value: string | null | undefined): PlanTier {
  return value === STANDARD_PLAN ? STANDARD_PLAN : STANDARD_PLAN;
}

export interface GatedInfo {
  title: string;
  description: string;
  features: string[];
}

export const STANDARD_FEATURES = [
  "Menaxhimi i klientëve",
  "Çmime të kompanisë",
  "Konfiguratori i dritareve dhe dyerve",
  "Projekte dhe oferta profesionale",
  "Ndjekja e statusit të ofertave",
  "Fatura, pagesa, borxh dhe kredi klienti",
  "Profili i kompanisë, anëtarët dhe shënimet",
];

const COMING_LATER =
  "Ky modul nuk është ende i disponueshëm në Kornizo. Kornizo Standard përfshin rrjedhën aktuale të plotë; mjete shtesë do të prezantohen me kujdes më vonë.";

// Routes for modules that are not implemented yet. These are not paid upgrade
// gates in launch; they are truthful coming-later placeholders.
export const gatedRoutes: Record<string, GatedInfo> = {
  "/finance": { title: "Financat", description: COMING_LATER, features: STANDARD_FEATURES },
  "/jobs": { title: "Prodhimi", description: COMING_LATER, features: STANDARD_FEATURES },
  "/stock": { title: "Stoku", description: COMING_LATER, features: STANDARD_FEATURES },
  "/monitoring": { title: "Monitorimi", description: COMING_LATER, features: STANDARD_FEATURES },
  "/workers": { title: "Punëtorët", description: COMING_LATER, features: STANDARD_FEATURES },
  "/assets": { title: "Asetet", description: COMING_LATER, features: STANDARD_FEATURES },
  "/documents": { title: "Dokumentet", description: COMING_LATER, features: STANDARD_FEATURES },
};

export const plans = [
  {
    tier: STANDARD_PLAN,
    name: STANDARD_PLAN_NAME,
    tagline: "Rrjedha e plotë aktuale për kompanitë e dritareve dhe dyerve",
    features: STANDARD_FEATURES,
  },
];

// Offer PDF design templates. Only "Klasik" is applied to generated offers today.
export const offerDesigns = [
  { id: "klasik", name: "Klasik", plan: STANDARD_PLAN, active: true },
];

// Config guide steps. Each step links to a local route so "open the relevant
// page" works. 12 steps total → matches the original 12/12.
export interface GuideStep {
  group: string;
  label: string;
  key: string;
  href: string;
}

export const guideGroups: { label: string; steps: { label: string; href: string }[] }[] = [
  {
    label: "KOMPANIA",
    steps: [
      { label: "Profili i kompanisë dhe logoja", href: "/settings" },
      { label: "Dizajni i ofertës", href: "/settings" },
    ],
  },
  {
    label: "ÇMIMET & SISTEMET",
    steps: [
      { label: "Brendet e profileve", href: "/pricing" },
      { label: "Sistemet e profileve", href: "/pricing" },
      { label: "Çmimet e profileve dhe armimi", href: "/pricing?tab=metals" },
      { label: "Mekanizmat dhe hardueri", href: "/pricing?tab=mechanisms" },
      { label: "Xhamat, panelet dhe dyert e hyrjes", href: "/pricing?tab=glass" },
      { label: "Shtesat, aksesorët dhe roletat", href: "/pricing?tab=accessories" },
      { label: "Parametrat e prodhimit", href: "/pricing?tab=production" },
    ],
  },
  {
    label: "PUNA E PARË",
    steps: [
      { label: "Klienti dhe projekti i parë", href: "/projects" },
      { label: "Oferta e parë", href: "/invoices" },
      { label: "Siguria e llogarisë", href: "/security" },
    ],
  },
];

export const guideKey = (group: string, step: string) => `${group}::${step}`;

export const guideSteps: GuideStep[] = guideGroups.flatMap((g) =>
  g.steps.map((s) => ({ group: g.label, label: s.label, href: s.href, key: guideKey(g.label, s.label) })),
);

export const guideStepKeys = guideSteps.map((s) => s.key);

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
