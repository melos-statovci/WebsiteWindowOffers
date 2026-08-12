// Server component: the Clients list is now sourced from Postgres (tenant-scoped
// via listClients -> requireAuthContext -> withOrg/RLS). The initial rows are
// fetched on the server; interactive search/filter/sort and the create/edit/
// delete flows live in the client view, which calls the server actions and
// router.refresh() to re-read this component.

import { listClients } from "@/server/clients";
import { ClientsView } from "./clients-view";

export default async function ClientsPage() {
  const clients = await listClients();
  return <ClientsView initialClients={clients} />;
}
