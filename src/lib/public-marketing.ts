import type { LucideIcon } from "lucide-react";
import {
  BadgeEuro,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  FolderKanban,
  Landmark,
  ListChecks,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Tags,
  Users,
  Wrench,
} from "lucide-react";
import { STANDARD_PLAN_NAME } from "@/lib/plan";
import type { PublicLocale } from "@/lib/public-routing";

const navHrefs = {
  product: "#product",
  workflow: "#workflow",
  features: "#features",
  standard: "#standard",
  faq: "#faq",
};

const englishWorkflowSteps = [
  {
    title: "Add the customer",
    description: "Keep client details, project context and account notes together before the offer starts.",
    icon: Users,
  },
  {
    title: "Configure windows and doors",
    description: "Choose product type, dimensions, profile systems, glass, mechanisms, colors and additions.",
    icon: Wrench,
  },
  {
    title: "Calculate the price",
    description: "Kornizo applies your company pricing and produces a server-authoritative offer total.",
    icon: Calculator,
  },
  {
    title: "Create and track the offer",
    description: "Move offers from draft to sent, accepted or refused, and keep projects organized.",
    icon: FileCheck2,
  },
  {
    title: "Invoice the customer",
    description: "Create invoices from accepted work or manually, with company billing details in place.",
    icon: FileText,
  },
  {
    title: "Track payment",
    description: "See paid, unpaid and overdue balances, including customer debt and credit.",
    icon: CreditCard,
  },
];

const englishFeatureGroups = [
  {
    title: "Configure and calculate",
    description: "Turn real window and door specifications into priced offer lines.",
    icon: Calculator,
    features: ["Window and door configurator", "Company-specific profile pricing", "Glass, panels, mechanisms and additions"],
  },
  {
    title: "Sell and organize",
    description: "Keep the sales workflow visible from first contact to accepted offer.",
    icon: FolderKanban,
    features: ["Client management", "Projects and professional offers", "Offer status tracking"],
  },
  {
    title: "Invoice and get paid",
    description: "Follow the money after the offer is accepted.",
    icon: Landmark,
    features: ["Invoices", "Payments", "Outstanding balances and customer credit"],
  },
  {
    title: "Work as a company",
    description: "Give the team one operating system for daily work.",
    icon: Building2,
    features: ["Team access", "Company settings", "Notes and account security"],
  },
];

const englishStandardPlan = {
  name: STANDARD_PLAN_NAME,
  summary: "Everything your window business needs to manage an offer from first contact to payment.",
  trial: "14-day full trial",
  included: [
    "Client and customer management",
    "Window and door configurator",
    "Company-specific pricing",
    "Professional offers and offer tracking",
    "Projects, invoices and payments",
    "Outstanding balances, customer credit, team access and company settings",
  ],
};

const englishProductProofItems = [
  { label: "Customer", value: "Site enquiry", icon: Users },
  { label: "Configuration", value: "2 windows, entrance door", icon: Settings2 },
  { label: "Price", value: "Calculated from company pricing", icon: Tags },
  { label: "Offer", value: "Draft -> Sent -> Accepted", icon: ClipboardList },
  { label: "Invoice", value: "Issued from accepted work", icon: FileText },
  { label: "Payment", value: "Balance visible", icon: BadgeEuro },
];

const englishFaqItems = [
  {
    question: "What is Kornizo?",
    answer:
      "Kornizo is a SaaS tool for window and door businesses. It connects customers, product configuration, price calculation, offers, projects, invoices and payments in one workflow.",
  },
  {
    question: "Who is Kornizo for?",
    answer:
      "It is built for companies that sell, quote, install or manage window and door work, especially teams that need company pricing and offer tracking in the same system.",
  },
  {
    question: "Does Kornizo support my own company pricing?",
    answer:
      "Yes. Kornizo includes company-specific pricing for profile systems, glass, panels, mechanisms, additions and related calculation settings.",
  },
  {
    question: "Can multiple employees use Kornizo?",
    answer:
      "Yes. Kornizo supports organization members and roles so a company can work from one shared account.",
  },
  {
    question: "What is included in the 14-day trial?",
    answer:
      "The launch trial includes the complete Kornizo Standard product for 14 days. It is not a stripped-down demo.",
  },
  {
    question: "What happens when the trial ends?",
    answer:
      "Access to normal tenant work is paused until the account is activated. Existing data is kept in place.",
  },
  {
    question: "Do I need to install software?",
    answer:
      "No. Kornizo runs in the browser, so your team can sign in through the web application.",
  },
  {
    question: "Can Kornizo track invoices and payments?",
    answer:
      "Yes. Kornizo includes invoices, payments, unpaid balances, overdue visibility and customer credit.",
  },
  {
    question: "Are more plans coming?",
    answer:
      "Kornizo is growing. Additional plans and advanced tools for different company sizes and workflows will be introduced over time.",
  },
];

const englishTemporaryCtaPages = {
  trial: {
    locale: "en" as const,
    logoHref: "/en",
    signInLabel: "Sign in",
    noFormNotice: "The form creates or uses a Kornizo account and stores a Trial Application for review.",
    title: "Request a Kornizo Standard trial",
    eyebrow: "14-day Kornizo Standard trial",
    description:
      "Submit a company application for review. Approval does not start tenant access until Kornizo prepares it.",
    primaryLabel: "Back to homepage",
    primaryHref: "/",
    secondaryLabel: "Sign in",
    secondaryHref: "/sign-in",
  },
  demo: {
    locale: "en" as const,
    logoHref: "/en",
    signInLabel: "Sign in",
    noFormNotice: "The demo request stores contact details only and does not create a Kornizo account.",
    title: "Request a Kornizo demo",
    eyebrow: "Kornizo product demo",
    description:
      "Send your company details so the Kornizo team can follow up internally.",
    primaryLabel: "Back to homepage",
    primaryHref: "/",
    secondaryLabel: "Sign in",
    secondaryHref: "/sign-in",
  },
};

export type MarketingIcon = LucideIcon;

const englishTrustItems = [
  { title: "One connected workflow", icon: ListChecks },
  { title: "Company pricing in the quote", icon: Tags },
  { title: "Full functionality during trial", icon: CheckCircle2 },
  { title: "Access controlled app routes", icon: ShieldCheck },
  { title: "Customer balances stay visible", icon: CreditCard },
  { title: "Notes and team context included", icon: MessageSquareText },
];

const albanianWorkflowSteps = [
  {
    title: "Shto klientin",
    description: "Mbaj të dhënat e klientit, kontekstin e projektit dhe shënimet në një vend para se të nisë oferta.",
    icon: Users,
  },
  {
    title: "Konfiguro dritaret dhe dyert",
    description: "Zgjidh llojin e produktit, përmasat, sistemet e profileve, xhamin, mekanizmat, ngjyrat dhe shtesat.",
    icon: Wrench,
  },
  {
    title: "Llogarit çmimin",
    description: "Kornizo përdor çmimet e kompanisë suaj dhe nxjerr totalin e ofertës nga llogaritja e serverit.",
    icon: Calculator,
  },
  {
    title: "Krijo dhe ndiq ofertën",
    description: "Kalo ofertat nga draft në të dërguara, të pranuara ose të refuzuara dhe mbaji projektet të organizuara.",
    icon: FileCheck2,
  },
  {
    title: "Lësho faturën",
    description: "Krijo faturë nga puna e pranuar ose manualisht, me të dhënat e faturimit të kompanisë në vend.",
    icon: FileText,
  },
  {
    title: "Ndiq pagesën",
    description: "Shih pagesat, detyrimet e hapura, vonesat dhe kredinë e klientit.",
    icon: CreditCard,
  },
];

const albanianFeatureGroups = [
  {
    title: "Konfiguro dhe llogarit",
    description: "Kthe specifikimet reale të dritareve dhe dyerve në rreshta oferte me çmim.",
    icon: Calculator,
    features: ["Konfigurator për dritare dhe dyer", "Çmime të profileve sipas kompanisë", "Xhama, panele, mekanizma dhe shtesa"],
  },
  {
    title: "Shit dhe organizo",
    description: "Mbaje të qartë rrjedhën e shitjes nga kontakti i parë deri te oferta e pranuar.",
    icon: FolderKanban,
    features: ["Menaxhim klientësh", "Projekte dhe oferta profesionale", "Ndjekje e statusit të ofertave"],
  },
  {
    title: "Faturoni dhe ndiq pagesat",
    description: "Vazhdo punën financiare pasi oferta të pranohet.",
    icon: Landmark,
    features: ["Fatura", "Pagesa", "Detyrime të hapura dhe kredi klienti"],
  },
  {
    title: "Punoni si kompani",
    description: "Jepi ekipit një sistem të përbashkët për punën e përditshme.",
    icon: Building2,
    features: ["Qasje për ekipin", "Cilësime të kompanisë", "Shënime dhe siguri e llogarisë"],
  },
];

const albanianStandardPlan = {
  name: STANDARD_PLAN_NAME,
  summary: "Gjithçka që i duhet biznesit tuaj të dritareve për ta menaxhuar ofertën nga kontakti i parë deri te pagesa.",
  trial: "Provë e plotë 14 ditë",
  included: [
    "Menaxhim klientësh",
    "Konfigurator për dritare dhe dyer",
    "Çmime sipas kompanisë",
    "Oferta profesionale dhe ndjekje statusi",
    "Projekte, fatura dhe pagesa",
    "Detyrime, kredi klienti, qasje ekipi dhe cilësime kompanie",
  ],
};

const albanianProductProofItems = [
  { label: "Klienti", value: "Kërkesë nga terreni", icon: Users },
  { label: "Konfigurimi", value: "2 dritare, derë hyrjeje", icon: Settings2 },
  { label: "Çmimi", value: "Llogaritur nga çmimet e kompanisë", icon: Tags },
  { label: "Oferta", value: "Draft -> Dërguar -> Pranuar", icon: ClipboardList },
  { label: "Fatura", value: "Nga puna e pranuar", icon: FileText },
  { label: "Pagesa", value: "Saldo e dukshme", icon: BadgeEuro },
];

const albanianFaqItems = [
  {
    question: "Çfarë është Kornizo?",
    answer:
      "Kornizo është një mjet SaaS për bizneset e dritareve dhe dyerve. Ai lidh klientët, konfigurimin e produkteve, llogaritjen e çmimeve, ofertat, projektet, faturat dhe pagesat në një rrjedhë të vetme.",
  },
  {
    question: "Për kë është Kornizo?",
    answer:
      "Kornizo është për kompani që shesin, ofertojnë, instalojnë ose menaxhojnë punë me dritare dhe dyer, sidomos për ekipe që duan çmimet e kompanisë dhe ndjekjen e ofertave në të njëjtin sistem.",
  },
  {
    question: "A mbështet Kornizo çmimet e kompanisë sime?",
    answer:
      "Po. Kornizo përfshin çmime sipas kompanisë për sisteme profilesh, xhama, panele, mekanizma, shtesa dhe parametra të tjerë të llogaritjes.",
  },
  {
    question: "A mund ta përdorin disa punonjës Kornizo-n?",
    answer:
      "Po. Kornizo mbështet anëtarë dhe role brenda organizatës, që kompania të punojë nga një llogari e përbashkët.",
  },
  {
    question: "Çfarë përfshihet në provën 14-ditore?",
    answer:
      "Prova e lansimit përfshin produktin e plotë Kornizo Standard për 14 ditë. Nuk është demo e kufizuar.",
  },
  {
    question: "Çfarë ndodh kur përfundon prova?",
    answer:
      "Qasja normale në punën e tenantit pauzohet derisa llogaria të aktivizohet. Të dhënat ekzistuese mbeten të ruajtura.",
  },
  {
    question: "A duhet të instaloj ndonjë program?",
    answer:
      "Jo. Kornizo punon në shfletues, kështu që ekipi juaj hyn përmes aplikacionit web.",
  },
  {
    question: "A mund të ndjek fatura dhe pagesa në Kornizo?",
    answer:
      "Po. Kornizo përfshin fatura, pagesa, saldo të papaguara, vonesa dhe kredi klienti.",
  },
  {
    question: "A do të ketë plane të tjera?",
    answer:
      "Kornizo po rritet. Plane shtesë dhe mjete të avancuara për madhësi e rrjedha të ndryshme kompanish do të prezantohen me kohë.",
  },
];

const albanianTemporaryCtaPages = {
  trial: {
    locale: "sq" as const,
    logoHref: "/",
    signInLabel: "Hyr",
    noFormNotice: "Formulari krijon ose përdor llogarinë Kornizo dhe ruan një Trial Application për shqyrtim.",
    title: "Kërko provë për Kornizo Standard",
    eyebrow: "Provë 14-ditore e Kornizo Standard",
    description:
      "Dërgoni aplikimin e kompanisë për shqyrtim. Aprovimi nuk hap qasje tenant derisa Kornizo ta përgatisë atë.",
    primaryLabel: "Kthehu në ballinë",
    primaryHref: "/",
    secondaryLabel: "Hyr",
    secondaryHref: "/sign-in",
  },
  demo: {
    locale: "sq" as const,
    logoHref: "/",
    signInLabel: "Hyr",
    noFormNotice: "Kërkesa demo ruan vetëm të dhëna kontakti dhe nuk krijon llogari Kornizo.",
    title: "Kërko demo për Kornizo",
    eyebrow: "Demo e produktit Kornizo",
    description:
      "Dërgoni të dhënat e kompanisë që ekipi Kornizo t'i përdorë për ndjekje të brendshme.",
    primaryLabel: "Kthehu në ballinë",
    primaryHref: "/",
    secondaryLabel: "Hyr",
    secondaryHref: "/sign-in",
  },
};

const albanianTrustItems = [
  { title: "Një rrjedhë e lidhur pune", icon: ListChecks },
  { title: "Çmimet e kompanisë brenda ofertës", icon: Tags },
  { title: "Funksionalitet i plotë gjatë provës", icon: CheckCircle2 },
  { title: "Rrugë aplikacioni me qasje të kontrolluar", icon: ShieldCheck },
  { title: "Saldo klientësh gjithmonë e dukshme", icon: CreditCard },
  { title: "Shënime dhe kontekst ekipi", icon: MessageSquareText },
];

export const publicMarketing = {
  sq: {
    locale: "sq" as const,
    basePath: "/",
    metadata: {
      title: "Kornizo | Konfigurim, oferta, fatura dhe pagesa për dritare e dyer",
      description:
        "Kornizo ndihmon kompanitë e dritareve dhe dyerve të konfigurojnë produkte, të llogarisin çmime, të krijojnë oferta, të ndjekin projekte, të faturojnë dhe të menaxhojnë pagesa.",
      ogTitle: "Kornizo - Nga konfigurimi i dritareve deri te pagesa",
      ogDescription:
        "Një rrjedhë e lidhur pune për kompani dritaresh dhe dyersh: klientë, konfigurim, çmime, oferta, fatura dhe pagesa.",
    },
    nav: [
      { label: "Produkti", href: navHrefs.product },
      { label: "Si funksionon", href: navHrefs.workflow },
      { label: "Funksionet", href: navHrefs.features },
      { label: "Standard", href: navHrefs.standard },
      { label: "FAQ", href: navHrefs.faq },
    ],
    actions: {
      signIn: "Hyr",
      requestTrial: "Kërko provë falas",
      requestDemo: "Kërko demo",
      openNavigation: "Hap navigimin",
      homepageAria: "Ballina Kornizo",
    },
    hero: {
      eyebrow: "Për kompani dritaresh dhe dyersh",
      title: "Nga konfigurimi i dritareve deri te pagesa, në një vend.",
      description:
        "Kornizo ndihmon kompanitë e dritareve dhe dyerve të konfigurojnë produkte, të llogarisin çmime, të krijojnë oferta profesionale, të ndjekin projekte, të lëshojnë fatura dhe të jenë në kontroll të pagesave.",
      bullets: ["Provë Standard 14 ditë", "Funksionalitet i plotë gjatë provës"],
    },
    productPreview: {
      chromeLabel: "Rrjedha e produktit Kornizo",
      standardTrial: "Provë Standard",
      sidebar: ["Dashboard", "Projektet", "Klientët", "Faturat", "Çmimet"],
      eyebrow: "Konfiguro ofertën",
      title: "Paketë dritaresh dhe dyersh",
      calculated: "Llogaritur",
      stageLabels: ["Konfig.", "Çmimi", "Oferta"],
    },
    productProof: {
      eyebrow: "Dëshmi produkti",
      title: "Rrjedhë reale për oferta, jo CRM i përgjithshëm.",
      description:
        "Faqja publike pasqyron aplikacionin aktual të tenantit: klientë, konfigurator, projekte, oferta, fatura, pagesa, çmime, shënime dhe cilësime kompanie.",
    },
    workflow: {
      eyebrow: "Si funksionon",
      title: "Nga klienti te pagesa, hap pas hapi.",
      description:
        "Kornizo e mban të dukshme rrugën komerciale, që ekipi të kalojë nga kërkesa fillestare te fatura e paguar pa humbur kontekst.",
      steps: albanianWorkflowSteps,
    },
    features: {
      eyebrow: "Funksionet",
      title: "Të grupuara sipas mënyrës si punojnë bizneset e dritareve.",
      description: "Çdo funksion i shfaqur këtu ekziston në produktin aktual Kornizo.",
      groups: albanianFeatureGroups,
    },
    standard: {
      eyebrow: "Një plan në lansim",
      badge: "Produkt i plotë",
      pricingNote:
        "Çmimi publik nuk është publikuar ende. Kornizo po rritet dhe plane shtesë e mjete të avancuara për madhësi e rrjedha të ndryshme kompanish do të prezantohen me kohë.",
      plan: albanianStandardPlan,
    },
    trustMetrics: [
      { title: "Çmime sipas kompanisë", text: "Çmimet vijnë nga katalogu dhe cilësimet tuaja.", icon: BadgeEuro },
      { title: "Nga oferta te fatura", text: "Puna e pranuar vazhdon në faturim dhe pagesa.", icon: FileText },
      { title: "Aplikacion i mbrojtur", text: "Rrugët e tenantit dhe platformës mbajnë kontrollin serverik të qasjes.", icon: ShieldCheck },
    ],
    faq: {
      eyebrow: "FAQ",
      title: "Përgjigje të qarta para se të kërkoni provën.",
      description: "Nuk shpikim çmime publike, dëshmi klientësh ose plane që nuk janë pjesë e lansimit.",
      items: albanianFaqItems,
    },
    finalCta: {
      eyebrow: "Kornizo Standard",
      title: "Gati t'i menaxhoni ofertat e dritareve në një vend?",
      description: "Dërgo kërkesën për provën e plotë 14-ditore të Kornizo Standard.",
    },
    footer: {
      description: "Konfigurim dritaresh dhe dyersh, oferta, projekte, fatura dhe pagesa në një produkt të lidhur.",
      product: "Produkti",
      trial: "Prova",
      demo: "Demo",
      privacy: "Privatësia",
      terms: "Kushtet",
      contactLabel: "Kontakt",
    },
    proofItems: albanianProductProofItems,
    trustItems: albanianTrustItems,
    temporaryCtaPages: albanianTemporaryCtaPages,
  },
  en: {
    locale: "en" as const,
    basePath: "/en",
    metadata: {
      title: "Kornizo | Window configuration, offers, invoices and payments",
      description:
        "Kornizo helps window and door companies configure products, calculate prices, create professional offers, track projects, issue invoices and stay on top of payments.",
      ogTitle: "Kornizo - From window configuration to payment",
      ogDescription:
        "A connected workflow for window and door companies: customers, configuration, pricing, offers, invoices and payments.",
    },
    nav: [
      { label: "Product", href: navHrefs.product },
      { label: "How it works", href: navHrefs.workflow },
      { label: "Features", href: navHrefs.features },
      { label: "Standard", href: navHrefs.standard },
      { label: "FAQ", href: navHrefs.faq },
    ],
    actions: {
      signIn: "Sign in",
      requestTrial: "Request free trial",
      requestDemo: "Request demo",
      openNavigation: "Open navigation",
      homepageAria: "Kornizo homepage",
    },
    hero: {
      eyebrow: "Built for window and door companies",
      title: "From window configuration to payment, all in one place.",
      description:
        "Kornizo helps window and door companies configure products, calculate prices, create professional offers, track projects, issue invoices and stay on top of payments.",
      bullets: ["14-day Standard trial", "Full functionality during trial"],
    },
    productPreview: {
      chromeLabel: "Kornizo product workflow",
      standardTrial: "Standard trial",
      sidebar: ["Dashboard", "Projects", "Clients", "Invoices", "Pricing"],
      eyebrow: "Configure offer",
      title: "Window and door package",
      calculated: "Calculated",
      stageLabels: ["Config", "Price", "Offer"],
    },
    productProof: {
      eyebrow: "Product proof",
      title: "A real workflow for offers, not a generic CRM.",
      description:
        "The public page mirrors Kornizo's current tenant application: clients, configurator, projects, offers, invoices, payments, pricing, notes and company settings.",
    },
    workflow: {
      eyebrow: "How it works",
      title: "Customer to payment, step by step.",
      description:
        "Kornizo keeps the commercial path visible so a team can move from enquiry to paid invoice without losing context.",
      steps: englishWorkflowSteps,
    },
    features: {
      eyebrow: "Capabilities",
      title: "Grouped around the way window businesses actually work.",
      description: "Every capability shown here exists in the current Kornizo product.",
      groups: englishFeatureGroups,
    },
    standard: {
      eyebrow: "One launch plan",
      badge: "Full product",
      pricingNote:
        "Pricing is not published yet. Kornizo is growing, and additional plans and advanced tools for different company sizes and workflows will be introduced over time.",
      plan: englishStandardPlan,
    },
    trustMetrics: [
      { title: "Company pricing", text: "Prices come from your own catalog and settings.", icon: BadgeEuro },
      { title: "Offer to invoice", text: "Accepted work can continue into invoicing and payments.", icon: FileText },
      { title: "Protected app", text: "Tenant and platform routes keep their authenticated server gates.", icon: ShieldCheck },
    ],
    faq: {
      eyebrow: "FAQ",
      title: "Clear answers before you request a trial.",
      description: "No public pricing, testimonials or unavailable plans are invented.",
      items: englishFaqItems,
    },
    finalCta: {
      eyebrow: "Kornizo Standard",
      title: "Ready to manage your window offers in one place?",
      description: "Request the complete 14-day Kornizo Standard trial.",
    },
    footer: {
      description: "Window and door configuration, offers, projects, invoices and payments in one connected product.",
      product: "Product",
      trial: "Trial",
      demo: "Demo",
      privacy: "Privacy",
      terms: "Terms",
      contactLabel: "Contact",
    },
    proofItems: englishProductProofItems,
    trustItems: englishTrustItems,
    temporaryCtaPages: englishTemporaryCtaPages,
  },
} satisfies Record<PublicLocale, unknown>;

export type PublicMarketingContent = (typeof publicMarketing)[PublicLocale];

export const publicNavItems = publicMarketing.en.nav;
export const workflowSteps = englishWorkflowSteps;
export const featureGroups = englishFeatureGroups;
export const standardPlan = englishStandardPlan;
export const productProofItems = englishProductProofItems;
export const faqItems = englishFaqItems;
export const temporaryCtaPages = englishTemporaryCtaPages;
export const trustItems = englishTrustItems;
