// PLATFORM control-plane shell. The server-authoritative gate for the ENTIRE
// /platform area: requirePlatformAdmin() redirects an unauthenticated visitor to
// /sign-in and returns notFound() for any signed-in non-admin (a tenant owner/
// admin sees a plain 404 — no acknowledgement the area exists). Every nested
// page and action re-checks platform authorization independently; this layout is
// the first, not the only, line of defense.
//
// The chrome is intentionally DISTINCT from the tenant AppShell (dark rail,
// "PLATFORM" wordmark) so an operator can never confuse the control plane with a
// customer's tenant app.

import Link from "next/link";
import { requirePlatformAdmin } from "@/server/platform/auth";
import { PlatformSignOut } from "./sign-out";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePlatformAdmin();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/platform" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-sm font-bold text-white">
              K
            </span>
            <span className="font-heading text-sm font-semibold tracking-wide text-white">
              KORNIZO <span className="text-indigo-300">PLATFORM</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/platform" className="text-slate-300 hover:text-white">
              Përmbledhje
            </Link>
            <Link href="/platform/organizations" className="text-slate-300 hover:text-white">
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
