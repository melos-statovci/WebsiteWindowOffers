// Account-suspended landing. Shown to a signed-in tenant member whose active
// organization has been suspended by a platform admin. It lives OUTSIDE the
// (app) route group so it never re-triggers the tenant suspension redirect.
//
// No business data is shown or touched — suspension is an access state, not a
// data operation. The user can sign out; reactivation (by a platform admin)
// restores normal access on the next load.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { getAccountState } from "@/server/platform/accounts";
import { SuspendedSignOut } from "./sign-out";

export default async function SuspendedPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect("/sign-in");

  // Resolve the active org (or first membership) and confirm it is actually
  // suspended — an active user who lands here is bounced back to the app.
  const orgs = await auth.api.listOrganizations({ headers: h });
  const activeId = session.session.activeOrganizationId ?? orgs?.[0]?.id ?? null;
  if (!activeId) redirect("/onboarding");
  const account = await getAccountState(activeId);
  if (account.status !== "suspended") redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl">
          ⏸️
        </div>
        <h1 className="font-heading text-xl font-semibold text-slate-900">Llogaria është pezulluar</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Qasja në aplikacion për këtë organizatë është pezulluar përkohësisht. Të
          dhënat tuaja janë të ruajtura dhe të paprekura.
        </p>
        {account.suspendedReason ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {account.suspendedReason}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-slate-500">
          Për ta riaktivizuar llogarinë, na kontaktoni te{" "}
          <a className="font-medium text-slate-900 underline" href="mailto:info@arios.systems">
            info@arios.systems
          </a>
          .
        </p>
        <div className="mt-6">
          <SuspendedSignOut />
        </div>
      </div>
    </main>
  );
}
