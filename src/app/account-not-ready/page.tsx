import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { SuspendedSignOut } from "@/app/suspended/sign-out";

export default async function AccountNotReadyPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect("/sign-in");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-amber-50 text-lg font-bold text-amber-600">
          K
        </div>
        <h1 className="font-heading text-xl font-semibold text-slate-900">Qasja nuk është ende gati</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Kjo organizatë nuk ka llogari të plotë Kornizo të konfiguruar. Qasja normale
          në aplikacion nuk hapet derisa ekipi i platformës ta përgatisë llogarinë.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Për ndihmë, na kontaktoni te{" "}
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
