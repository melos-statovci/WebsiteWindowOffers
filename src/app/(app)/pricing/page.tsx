import { requireAuthContext } from "@/auth/session";
import { getActivePriceList } from "@/server/pricing";
import { can } from "@/server/authz";
import { PricingClient } from "@/components/pricing/pricing-client";

// Server-authoritative pricing entry. Loads the active organization's pricing
// version (RLS-scoped) and resolves edit authorization from the CANONICAL
// permissions (can(role, pricing:edit)) — never a client-side role list. The
// editor baseline and the optimistic-concurrency baseVersion come from here, so
// a save is always diffed against a freshly-loaded server version.
export default async function PricingPage() {
  const { role } = await requireAuthContext();
  const active = await getActivePriceList();
  const canEdit = can(role, { pricing: ["edit"] });

  return (
    <PricingClient
      initialCatalog={active.catalog}
      initialVersion={active.version}
      canEdit={canEdit}
    />
  );
}
