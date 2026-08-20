"use client";

// Client mutation controls for the org detail view. Each calls a platform "use
// server" action (which independently re-verifies platform-admin authorization)
// and refreshes on success. These controls are pure UI — they hold NO authority;
// a non-admin who somehow rendered them still gets FORBIDDEN from the server.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/kit";
import { PLAN_TIERS, type PlanTier } from "@/lib/plan";
import {
  setOrganizationPlan,
  setOrganizationStatus,
  setOrganizationInternalNote,
} from "@/server/platform/actions/organization.action";
import type { AccountStatus } from "@/server/platform/accounts";

const fieldCls =
  "h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-violet-500 focus:outline-none";

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
        <select value={value} onChange={(e) => setValue(e.target.value as PlanTier)} className={fieldCls}>
          {PLAN_TIERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              setErr(null);
              const res = await setOrganizationPlan({ organizationId, plan: value });
              if (res.ok) router.refresh();
              else setErr(res.error.message);
            })
          }
        >
          {pending ? "Duke ruajtur…" : "Ndrysho planin"}
        </Button>
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
      <Button variant={suspend ? "danger" : "primary"} size="sm" onClick={() => setConfirming(true)}>
        {suspend ? "Pezullo organizatën" : "Riaktivizo organizatën"}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-900">
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
          className={`mt-3 w-full ${fieldCls}`}
        />
      )}
      <div className="mt-3 flex items-center gap-2">
        <Button variant={suspend ? "danger" : "primary"} size="sm" disabled={pending} onClick={submit}>
          {pending ? "Duke aplikuar…" : suspend ? "Konfirmo pezullimin" : "Konfirmo riaktivizimin"}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => { setConfirming(false); setErr(null); }}>
          Anulo
        </Button>
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
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              setErr(null);
              const res = await setOrganizationInternalNote({ organizationId, note: value.trim() });
              if (res.ok) { setSaved(true); router.refresh(); }
              else setErr(res.error.message);
            })
          }
        >
          {pending ? "Duke ruajtur…" : "Ruaj shënimin"}
        </Button>
        {saved && !dirty && <span className="text-xs text-emerald-500">U ruajt.</span>}
      </div>
      <Err msg={err} />
    </div>
  );
}
