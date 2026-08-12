// Server component: the client identity is loaded from Postgres, tenant-scoped
// (getClient -> requireAuthContext -> withOrg/RLS). A nonexistent id, a malformed
// id, or another organization's client all resolve to null with no disclosure —
// the client component renders the same "not found" state for every case.
//
// TRANSITIONAL (Phase 4): the card's related tabs (projects/offers/payments/
// notes) are still backed by local/demo data. They are filtered by this client's
// UUID, so a freshly created DB client correctly shows none until local records
// reference it — those domains migrate in a later phase.

import { getClient } from "@/server/clients";
import { ClientDetail } from "./client-detail";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  return <ClientDetail client={client} clientId={clientId} />;
}
