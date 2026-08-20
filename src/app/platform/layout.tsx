// PLATFORM control-plane shell. The server-authoritative gate for the ENTIRE
// /platform area: requirePlatformAdmin() redirects an unauthenticated visitor to
// /sign-in and returns notFound() for any signed-in non-admin (a tenant owner/
// admin sees a plain 404 — no acknowledgement the area exists). Every nested
// page and action re-checks platform authorization independently; this layout is
// the first, not the only, line of defense.
//
// The chrome is theme-aware (reuses the tenant tokens so it is legible in light
// AND dark), but visually DISTINCT from the tenant AppShell via a violet accent
// strip + "PLATFORM" wordmark, so an operator can never confuse the control plane
// with a customer's tenant app.

import Link from "next/link";
import { requirePlatformAdmin } from "@/server/platform/auth";
import { PlatformSignOut } from "./sign-out";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePlatformAdmin();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-1 w-full bg-violet-500" />
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/platform" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500 text-sm font-bold text-white">
              K
            </span>
            <span className="font-heading text-sm font-semibold tracking-wide text-slate-900">
              KORNIZO <span className="text-violet-500">PLATFORM</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/platform" className="text-slate-500 hover:text-slate-900">
              Përmbledhje
            </Link>
            <Link href="/platform/organizations" className="text-slate-500 hover:text-slate-900">
              Organizatat
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-slate-400 sm:inline">{ctx.user.email}</span>
            <PlatformSignOut />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
