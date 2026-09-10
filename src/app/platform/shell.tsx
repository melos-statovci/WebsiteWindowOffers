"use client";

// Platform control-plane shell: a persistent, theme-aware sidebar (fixed on
// lg+, off-canvas drawer below) with active-route highlighting, a clear "back to
// tenant app" link, and the signed-in admin + sign-out. It is DISTINCT from the
// tenant AppShell (violet "PLATFORM" identity) so an operator never confuses the
// control plane with a customer tenant.
//
// SECURITY: the sidebar is navigation only — it grants no authority. Every route
// it links to independently enforces platform authorization on the server, so a
// tenant user gains nothing by learning these URLs.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Inbox,
  ShieldCheck,
  ScrollText,
  ExternalLink,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/auth/client";

const NAV = [
  { href: "/platform", label: "Përmbledhje", icon: LayoutDashboard, exact: true },
  { href: "/platform/organizations", label: "Organizatat", icon: Building2, exact: false },
  { href: "/platform/applications", label: "Applications", icon: Inbox, exact: false },
  { href: "/platform/admins", label: "Platform Admins", icon: ShieldCheck, exact: false },
  { href: "/platform/activity", label: "Aktiviteti", icon: ScrollText, exact: false },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-violet-500/15 text-violet-600"
                : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-900",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/platform" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-sm font-bold text-white">
        K
      </span>
      <span className="font-heading text-sm font-semibold tracking-wide text-slate-900">
        KORNIZO <span className="text-violet-500">PLATFORM</span>
      </span>
    </Link>
  );
}

function Footer({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="mt-auto space-y-2 border-t border-slate-200 pt-3">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
      >
        <ExternalLink className="size-4 shrink-0" />
        Hap aplikacionin e tenantit
      </Link>
      <div className="truncate px-3 text-xs text-slate-400">{email}</div>
      <button
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
      >
        <LogOut className="size-4 shrink-0" />
        Dilni
      </button>
    </div>
  );
}

export function PlatformShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Violet identity strip */}
      <div className="fixed inset-x-0 top-0 z-40 h-1 bg-violet-500" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-slate-100 p-4 pt-5 lg:flex">
        <div className="mb-6">
          <Brand />
        </div>
        <NavLinks pathname={pathname} />
        <Footer email={email} onSignOut={signOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-slate-100/95 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
          aria-label="Hap menunë"
        >
          <Menu className="size-5" />
        </button>
        <Brand />
      </header>

      {/* Mobile off-canvas drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-slate-100 p-4 pt-5">
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
                aria-label="Mbyll menunë"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <Footer email={email} onSignOut={signOut} />
          </div>
        </div>
      )}

      <main className="px-4 py-8 sm:px-6 lg:ml-60 lg:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
