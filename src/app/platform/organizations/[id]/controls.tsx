"use client";

// Client mutation controls for the org detail view. Each calls a platform "use
// server" action (which independently re-verifies platform-admin authorization)
// and refreshes on success. These controls are pure UI — they hold NO authority;
// a non-admin who somehow rendered them still gets FORBIDDEN from the server.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PLAN_TIERS, type PlanTier } from "@/lib/plan";
import {
  setOrganizationPlan,
  setOrganizationStatus,
  setOrganizationInternalNote,
} from "@/server/platform/actions/organization.action";
import type { AccountStatus } from "@/server/platform/accounts";

function Err({ msg }: { msg: string | null }) {
  return msg ? <p className="mt-2 text-xs text-rose-400">{msg}</p> : null;
}

export function PlanControl({ organizationId, plan }: { organizationId: string; plan: PlanTier }) {
  const router = useRouter();
  const [value, setValue] = useState<PlanTier>(plan);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = value !== plan;

  return (
    <div>
      <div className="flex items-center gap-3">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value as PlanTier)}
          className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        >
          {PLAN_TIERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              setErr(null);
              const res = await setOrganizationPlan({ organizationId, plan: value });
              if (res.ok) router.refresh();
              else setErr(res.error.message);
            })
          }
          className="h-9 rounded-md bg-indigo-500 px-4 text-sm font-medium text-white enabled:hover:bg-indigo-400 disabled:opacity-40"
        >
          {pending ? "Duke ruajtur…" : "Ndrysho planin"}
        </button>
      </div>
      <Err msg={err} />
    </div>
  );
}

export function StatusControl({
  organizationId,
  status,
  orgName,
}: {
  organizationId: string;
  status: AccountStatus;
  orgName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const suspend = status === "active";

  const submit = () =>
    start(async () => {
      setErr(null);
      const res = await setOrganizationStatus(
        suspend
          ? { organizationId, status: "suspended", reason: reason.trim() || undefined }
          : { organizationId, status: "active" },
      );
      if (res.ok) {
        setConfirming(false);
        setReason("");
        router.refresh();
      } else setErr(res.error.message);
    });

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className={
          suspend
            ? "h-9 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
            : "h-9 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
        }
      >
        {suspend ? "Pezullo organizatën" : "Riaktivizo organizatën"}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
      <p className="text-sm text-slate-200">
        {suspend ? (
          <>
            Pezullimi bllokon qasjen e anëtarëve të <span className="font-semibold">{orgName}</span> në
            aplikacion. Të dhënat NUK fshihen dhe mund të riaktivizohet në çdo kohë.
          </>
        ) : (
          <>Riaktivizimi rikthen qasjen e plotë për anëtarët e <span className="font-semibold">{orgName}</span>.</>
        )}
      </p>
      {suspend && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Arsyeja (opsionale, shfaqet te tenanti)"
          maxLength={300}
          className="mt-3 h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={pending}
          onClick={submit}
          className={
            suspend
              ? "h-9 rounded-md bg-amber-500 px-4 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
              : "h-9 rounded-md bg-emerald-500 px-4 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
          }
        >
          {pending ? "Duke aplikuar…" : suspend ? "Konfirmo pezullimin" : "Konfirmo riaktivizimin"}
        </button>
        <button
          disabled={pending}
          onClick={() => { setConfirming(false); setErr(null); }}
          className="h-9 rounded-md border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-800"
        >
          Anulo
        </button>
      </div>
      <Err msg={err} />
    </div>
  );
}

export function InternalNoteControl({ organizationId, note }: { organizationId: string; note: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = value !== (note ?? "");

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        rows={3}
        maxLength={2000}
        placeholder="Shënim i brendshëm (i padukshëm për tenantin)…"
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              setErr(null);
              const res = await setOrganizationInternalNote({ organizationId, note: value.trim() });
              if (res.ok) { setSaved(true); router.refresh(); }
              else setErr(res.error.message);
            })
          }
          className="h-9 rounded-md bg-slate-700 px-4 text-sm font-medium text-white enabled:hover:bg-slate-600 disabled:opacity-40"
        >
          {pending ? "Duke ruajtur…" : "Ruaj shënimin"}
        </button>
        {saved && !dirty && <span className="text-xs text-emerald-400">U ruajt.</span>}
      </div>
      <Err msg={err} />
    </div>
  );
}
