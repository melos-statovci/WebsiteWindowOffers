// PLATFORM control-plane layout. The server-authoritative gate for the ENTIRE
// /platform area: requirePlatformAdmin() redirects an unauthenticated visitor to
// /sign-in and returns notFound() for any signed-in non-admin (a tenant owner/
// admin sees a plain 404 — no acknowledgement the area exists). Every nested
// page and action re-checks platform authorization independently; this layout is
// the first, not the only, line of defense.
//
// The chrome (PlatformShell) is a theme-aware sidebar, visually distinct from the
// tenant AppShell via the violet "PLATFORM" identity.

import { requirePlatformAdmin } from "@/server/platform/auth";
import { PlatformShell } from "./shell";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePlatformAdmin();
  return <PlatformShell email={ctx.user.email}>{children}</PlatformShell>;
}
