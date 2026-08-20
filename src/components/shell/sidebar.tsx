"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { navGroups } from "@/lib/nav";
import { useApp } from "@/components/providers/providers";
import { useAuth, useAuthActions } from "@/components/providers/session-provider";
import type { OrgSummary } from "@/auth/types";

function Logo({ collapsed }: { collapsed?: boolean }) {
  // Real plan tier from the platform control plane (via the server-resolved auth
  // context) — reflects a platform-admin plan change on the next load.
  const { plan } = useAuth();
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 font-heading text-lg font-bold text-white">
        K
      </span>
      {!collapsed && (
        <div className="leading-tight">
          <div className="brand-wordmark font-heading text-lg font-bold">
            Kornizo
          </div>
          <div className="text-[11px] font-medium tracking-wide text-slate-400">
            Plani {plan}
          </div>
        </div>
      )}
    </div>
  );
}

function NavContent({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { setOverlay } = useApp();
  const { user, activeOrg, role, memberships } = useAuth();
  const { signOut, switchOrg } = useAuthActions();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-full flex-col">
      {/* User block — real identity from the Better Auth session */}
      {!collapsed && (
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 font-heading text-sm font-semibold text-slate-500">
              {initials(user.name || user.email)}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-slate-900">{user.name || user.email}</div>
              <div className="text-xs text-slate-400 capitalize">{role}</div>
            </div>
          </div>
          <OrgSwitcher activeOrg={activeOrg} memberships={memberships} onSwitch={switchOrg} />
        </div>
      )}

      {/* Guide row */}
      <div className={cn("px-3 pt-4", collapsed && "px-2")}>
        <button
          onClick={() => {
            setOverlay("config");
            onNavigate?.();
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl bg-violet-50 px-3 py-3 text-left font-semibold text-violet-400 transition-colors hover:bg-violet-50/80",
            collapsed && "justify-center px-0",
          )}
          title="Udhëzuesi"
        >
          <Rocket className="size-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">Udhëzuesi</span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-violet-400">
                12/12
              </span>
            </>
          )}
        </button>
      </div>

      {/* Groups */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-slate-200 text-slate-900"
                          : "text-slate-700 hover:bg-slate-200/50 hover:text-slate-900",
                      )}
                    >
                      <Icon className="size-5 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout — real Better Auth sign-out */}
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200/50",
            collapsed && "justify-center px-0",
          )}
          title="Shkyçu"
        >
          <LogOut className="size-5 shrink-0" />
          {!collapsed && <span>Shkyçu</span>}
        </button>
      </div>
    </div>
  );
}

function OrgSwitcher({
  activeOrg,
  memberships,
  onSwitch,
}: {
  activeOrg: OrgSummary;
  memberships: OrgSummary[];
  onSwitch: (organizationId: string) => void;
}) {
  if (memberships.length <= 1) {
    return (
      <div className="mt-3 truncate rounded-lg bg-slate-200/60 px-2.5 py-1.5 text-xs font-semibold text-slate-700" title={activeOrg.name}>
        {activeOrg.name}
      </div>
    );
  }
  return (
    <select
      value={activeOrg.id}
      onChange={(e) => onSwitch(e.target.value)}
      aria-label="Ndrysho organizatën"
      className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-neutral-500"
    >
      {memberships.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useApp();

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-slate-100 lg:flex",
          sidebarCollapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-slate-200 px-4",
            sidebarCollapsed && "justify-center px-0",
          )}
        >
          <Logo collapsed={sidebarCollapsed} />
        </div>
        <div className="min-h-0 flex-1">
          <NavContent collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85%] flex-col bg-slate-100 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <Logo />
              <button
                onClick={() => setMobileNavOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-900"
                aria-label="Mbyll menynë"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <NavContent onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
