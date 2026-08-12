import { requireAuthContext } from "@/auth/session";
import { listClients } from "@/server/clients";
import { SessionProvider } from "@/components/providers/session-provider";
import { ClientsHydrator } from "@/components/providers/clients-hydrator";
import { AppShell } from "@/components/shell/app-shell";

// Server-side authoritative gate for the whole app shell. requireAuthContext
// redirects to /sign-in (no session) or /onboarding (no organization) and
// resolves the real identity/active-org/role passed into the client shell.
//
// We also fetch the active org's clients here (one indexed, RLS-scoped query) to
// seed the store's read-only mirror app-wide, so still-local features that
// reference clients (search, pickers, dashboard) keep working during the phased
// migration.
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuthContext();
  const clients = await listClients();
  return (
    <SessionProvider value={ctx}>
      <ClientsHydrator clients={clients} />
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
