import { requireAuthContext } from "@/auth/session";
import { SessionProvider } from "@/components/providers/session-provider";

// The configurator lives outside the (app) group but renders the shared Sidebar,
// so it needs the same server-side auth gate + session context.
export default async function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuthContext();
  return <SessionProvider value={ctx}>{children}</SessionProvider>;
}
