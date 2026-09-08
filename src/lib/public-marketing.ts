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

export const publicNavItems = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#workflow" },
  { label: "Features", href: "#features" },
  { label: "Standard", href: "#standard" },
  { label: "FAQ", href: "#faq" },
];

export const workflowSteps = [
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

export const featureGroups = [
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

export const standardPlan = {
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

export const productProofItems = [
  { label: "Customer", value: "Site enquiry", icon: Users },
  { label: "Configuration", value: "2 windows, entrance door", icon: Settings2 },
  { label: "Price", value: "Calculated from company pricing", icon: Tags },
  { label: "Offer", value: "Draft -> Sent -> Accepted", icon: ClipboardList },
  { label: "Invoice", value: "Issued from accepted work", icon: FileText },
  { label: "Payment", value: "Balance visible", icon: BadgeEuro },
];

export const faqItems = [
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

export const temporaryCtaPages = {
  trial: {
    title: "Trial requests are opening soon",
    eyebrow: "14-day Kornizo Standard trial",
    description:
      "The public application flow is not open yet. The next launch milestone will add the request, review and approval process for full Standard trials.",
    primaryLabel: "Back to homepage",
    primaryHref: "/",
    secondaryLabel: "Sign in",
    secondaryHref: "/sign-in",
  },
  demo: {
    title: "Demo requests are opening soon",
    eyebrow: "Kornizo product demo",
    description:
      "The public demo request flow is not open yet. This page is intentionally non-persisting until the real application workflow is built.",
    primaryLabel: "Back to homepage",
    primaryHref: "/",
    secondaryLabel: "Sign in",
    secondaryHref: "/sign-in",
  },
};

export type MarketingIcon = LucideIcon;

export const trustItems = [
  { title: "One connected workflow", icon: ListChecks },
  { title: "Company pricing in the quote", icon: Tags },
  { title: "Full functionality during trial", icon: CheckCircle2 },
  { title: "Access controlled app routes", icon: ShieldCheck },
  { title: "Customer balances stay visible", icon: CreditCard },
  { title: "Notes and team context included", icon: MessageSquareText },
];
