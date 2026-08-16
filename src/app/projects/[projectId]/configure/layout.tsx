import { requireAuthContext } from "@/auth/session";
import { listClients } from "@/server/clients";
import { getActivePricingCatalog } from "@/server/pricing";
import { listProjects } from "@/server/projects";
import { SessionProvider } from "@/components/providers/session-provider";
import { ClientsHydrator } from "@/components/providers/clients-hydrator";
import { PricingHydrator } from "@/components/providers/pricing-hydrator";
import { ProjectsHydrator } from "@/components/providers/projects-hydrator";

// The configurator lives outside the (app) group but renders the shared Sidebar
// and reads projects/pricing from the store mirror — so it needs the same
// server-side auth gate AND the same server-hydrated mirrors as the app shell.
// Hydrating here (not only in the (app) layout) means a hard load of the
// configurator URL, and the live-price preview, both see the org's authoritative
// server data rather than an empty/seed store. Re-fetched on every render, so a
// mutation's router.refresh() (or an org switch) replaces them.
export default async function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuthContext();
  const [clients, pricing, projects] = await Promise.all([
    listClients(),
    getActivePricingCatalog(),
    listProjects(),
  ]);
  return (
    <SessionProvider value={ctx}>
      <ClientsHydrator clients={clients} />
      <PricingHydrator pricing={pricing} />
      <ProjectsHydrator projects={projects} />
      {children}
    </SessionProvider>
  );
}
