import { requireAuthContext } from "@/auth/session";
import { listClients } from "@/server/clients";
import { getActivePricingCatalog } from "@/server/pricing";
import { listProjects } from "@/server/projects";
import { listInvoices } from "@/server/invoices";
import { listPayments } from "@/server/payments";
import { getOrganizationProfile } from "@/server/organization-profile";
import { SessionProvider } from "@/components/providers/session-provider";
import { ClientsHydrator } from "@/components/providers/clients-hydrator";
import { PricingHydrator } from "@/components/providers/pricing-hydrator";
import { ProjectsHydrator } from "@/components/providers/projects-hydrator";
import { InvoicesHydrator } from "@/components/providers/invoices-hydrator";
import { PaymentsHydrator } from "@/components/providers/payments-hydrator";
import { CompanyHydrator } from "@/components/providers/company-hydrator";
import { AppShell } from "@/components/shell/app-shell";

// Server-side authoritative gate for the whole app shell. requireAuthContext
// redirects to /sign-in (no session) or /onboarding (no organization) and
// resolves the real identity/active-org/role passed into the client shell.
//
// We also fetch the active org's clients (Phase 4) and active PricingCatalog
// (Phase 5) here, RLS-scoped, to hydrate the store's server-backed runtime
// mirrors app-wide — so still-local features that reference clients (search,
// pickers, dashboard) and the configurator's live pricing preview keep working.
// Both are re-fetched on every layout render, so an org switch replaces them.
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuthContext();
  const [clients, pricing, projects, invoices, payments, company] = await Promise.all([
    listClients(),
    getActivePricingCatalog(),
    listProjects(),
    listInvoices(),
    listPayments(),
    getOrganizationProfile(),
  ]);
  return (
    <SessionProvider value={ctx}>
      <ClientsHydrator clients={clients} />
      <PricingHydrator pricing={pricing} />
      <ProjectsHydrator projects={projects} />
      <InvoicesHydrator invoices={invoices} />
      <PaymentsHydrator payments={payments} />
      <CompanyHydrator company={company} />
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
