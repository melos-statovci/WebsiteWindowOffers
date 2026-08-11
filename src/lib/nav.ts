import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ReceiptText,
  Tags,
  ShieldCheck,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
