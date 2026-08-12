import { requireAuthContext } from "@/auth/session";
import { SessionProvider } from "@/components/providers/session-provider";
import { AppShell } from "@/components/shell/app-shell";

// Server-side authoritative gate for the whole app shell. requireAuthContext
// redirects to /sign-in (no session) or /onboarding (no organization) and
// resolves the real identity/active-org/role passed into the client shell.
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuthContext();
  return (
    <SessionProvider value={ctx}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
