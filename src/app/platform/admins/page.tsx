// Platform Admins — a READ-ONLY, truthful view of who currently holds platform
// authority. Authorization: the platform layout gate (a tenant user gets a 404
// at /platform and never enumerates admins here).
//
// DELIBERATELY read-only in V1.5. Provisioning stays OUT OF BAND
// (scripts/seed-platform-admin.mjs, owner credentials), which is exactly what
// makes it safe: the running application — even a compromised one — has no path
// to grant platform authority, so there is no in-app privilege-escalation
// surface, no self-promotion, and no last-admin-lockout risk to defend. See
// PLATFORM_ADMIN_V15_HANDOFF.md §"Platform Admins management" for the V2 note.

import { listPlatformAdmins } from "@/server/platform/organizations";
import { PanelCard } from "../ui";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function PlatformAdminsPage() {
  const admins = await listPlatformAdmins();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Platform Admins</h1>
        <p className="mt-1 text-sm text-slate-400">{admins.length} operatorë të autorizuar të platformës</p>
      </div>

      <PanelCard>
        {admins.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Asnjë platform admin.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 font-medium">Emri</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Shënim</th>
                  <th className="py-2 pr-4 font-medium">Autorizuar</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.userId} className="border-b border-slate-200/70 last:border-0">
                    <td className="py-2.5 pr-4 text-slate-900">{a.name || "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{a.email}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{a.note || "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{fmtDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-500">
        <p className="font-medium text-slate-900">Menaxhimi bëhet jashtë aplikacionit</p>
        <p className="mt-1">
          Dhënia dhe heqja e të drejtave të platformës kryhet vetëm nga skripti i
          provizionimit me kredencialet e pronarit të bazës së të dhënave, jo nga ky
          panel. Kjo siguron që aplikacioni në ekzekutim — edhe nëse kompromentohet —
          nuk mund të krijojë kurrë një platform admin të ri.
        </p>
      </div>
    </div>
  );
}
