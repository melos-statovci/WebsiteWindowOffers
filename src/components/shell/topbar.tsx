"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Settings as SettingsIcon,
  LifeBuoy,
  Search,
  Bell,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { routeTitles } from "@/lib/nav";
import { useApp } from "@/components/providers/providers";

function pageTitle(pathname: string): string {
  const base = "/" + (pathname.split("/")[1] ?? "");
  return routeTitles[base] ?? "Proferto";
}

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    theme,
    toggleTheme,
    toggleSidebar,
    setMobileNavOpen,
    setOverlay,
    notificationsOpen,
    setNotificationsOpen,
  } = useApp();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-slate-100/80 px-3 backdrop-blur-md sm:px-5">
      {/* Hamburger: toggles mobile nav on small screens, rail collapse on desktop */}
      <button
        onClick={() => {
          setMobileNavOpen(true);
          toggleSidebar();
        }}
        className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
        aria-label="Hap menynë"
      >
        <Menu className="size-5" />
      </button>
      <button
        onClick={() => router.push("/settings")}
        className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
        aria-label="Cilësimet"
      >
        <SettingsIcon className="size-5" />
      </button>

      <h1 className="ml-1 truncate font-heading text-lg font-semibold text-slate-900 sm:text-xl">
        {pageTitle(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setOverlay("help")}
          className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-indigo-400 hover:bg-slate-200/60 sm:flex"
        >
          <LifeBuoy className="size-5" />
          Ndihmë
        </button>

        <button
          onClick={() => setOverlay("search")}
          className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:border-slate-300 sm:flex sm:w-56 md:w-72"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Kërko…</span>
          <kbd className="rounded border border-slate-200 bg-slate-200/60 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={() => setOverlay("search")}
          className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 sm:hidden"
          aria-label="Kërko"
        >
          <Search className="size-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
            aria-label="Njoftimet"
          >
            <Bell className="size-5" />
          </button>
          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotificationsOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-heading font-semibold text-slate-900">
                    Njoftimet
                  </span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Mbyll"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="py-4 text-center text-sm text-slate-400">
                  Asnjë njoftim. Gjithçka në rregull.
                </p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
          aria-label={theme === "dark" ? "Kalo në ditë" : "Kalo në natë"}
        >
          {theme === "dark" ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </button>
      </div>
    </header>
  );
}
