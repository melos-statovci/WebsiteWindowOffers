import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ReceiptText,
  BarChart3,
  Package,
  Layers,
  Activity,
  HardHat,
  Truck,
  FileText,
  Tags,
  ShieldCheck,
  Settings,
} from "lucide-react";

export type PlanTier = "SOLO" | "BIZNES" | "FABRIKA";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  lockedFor?: PlanTier; // plan required to unlock
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "KRYESORE",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Projektet", href: "/projects", icon: FolderKanban },
      { label: "Klientët", href: "/clients", icon: Users },
    ],
  },
  {
    label: "FINANCA",
    items: [
      { label: "Faturat", href: "/invoices", icon: ReceiptText },
      { label: "Financat", href: "/finance", icon: BarChart3, lockedFor: "BIZNES" },
    ],
  },
  {
    label: "OPERACIONET",
    items: [
      { label: "Prodhimi", href: "/jobs", icon: Package, lockedFor: "BIZNES" },
      { label: "Stoku", href: "/stock", icon: Layers, lockedFor: "BIZNES" },
      { label: "Monitorimi", href: "/monitoring", icon: Activity, lockedFor: "BIZNES" },
    ],
  },
  {
    label: "BURIMET",
    items: [
      { label: "Punëtorët", href: "/workers", icon: HardHat, lockedFor: "FABRIKA" },
      { label: "Asetet", href: "/assets", icon: Truck, lockedFor: "FABRIKA" },
      { label: "Dokumentet", href: "/documents", icon: FileText, lockedFor: "FABRIKA" },
    ],
  },
  {
    label: "SISTEMET",
    items: [
      { label: "Çmimet & Sistemet", href: "/pricing", icon: Tags },
      { label: "Siguria", href: "/security", icon: ShieldCheck },
      { label: "Cilësimet", href: "/settings", icon: Settings },
    ],
  },
];

// Page title shown in the top bar per route
export const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projektet",
  "/clients": "Klientët",
  "/invoices": "Faturat",
  "/finance": "Financat",
  "/jobs": "Prodhimi",
  "/stock": "Stoku",
  "/monitoring": "Monitorimi",
  "/workers": "Punëtorët",
  "/assets": "Asetet",
  "/documents": "Dokumentet",
  "/pricing": "Çmimet & Sistemet",
  "/security": "Siguria",
  "/settings": "Cilësimet",
};
