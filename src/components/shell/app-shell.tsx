"use client";

import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/providers";
import { SupportContactProvider, type SupportContact } from "@/components/providers/support-contact";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TrialBanner, FloatingConfig } from "./floating";
import { HelpDrawer, ConfigGuideDrawer } from "./drawers";
import { SearchPalette } from "./search-palette";

/**
 * `supportContact` is resolved on the SERVER (the tenant layout) and threaded
 * down, because the near-expiry notice is a client component and cannot read
 * process.env at runtime. Its `email` may be null — see support-contact.ts.
 */
export function AppShell({
  children,
  supportContact,
}: {
  children: React.ReactNode;
  supportContact: SupportContact;
}) {
  const { sidebarCollapsed } = useApp();
  return (
    <SupportContactProvider contact={supportContact}>
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[264px]",
        )}
      >
        <TrialBanner supportContact={supportContact} />
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
    </SupportContactProvider>
  );
}
