"use client";

import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/providers";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TrialBanner, FloatingConfig } from "./floating";
import { HelpDrawer, ConfigGuideDrawer } from "./drawers";
import { SearchPalette } from "./search-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useApp();
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[264px]",
        )}
      >
        <TrialBanner />
        <Topbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <FloatingConfig />
      <HelpDrawer />
      <ConfigGuideDrawer />
      <SearchPalette />
    </div>
  );
}
