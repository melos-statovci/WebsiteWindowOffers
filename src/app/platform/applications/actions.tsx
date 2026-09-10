"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, X } from "lucide-react";
import {
  retryTrialApplicationProvisioning,
  reviewTrialApplication,
  setDemoRequestStatus,
} from "@/server/platform/actions/applications.action";
import type { DemoRequestStatus } from "@/server/acquisition";

export function TrialReviewControls({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(decision: "approved" | "rejected") {
    setError("");
    startTransition(async () => {
      // Guarded: a REJECTED action promise (offline, transport failure) would
      // otherwise leave the operator with no feedback on the click that
      // approves a customer — and an applicant waiting on a decision the
      // operator believes they made.
      try {
        const res = await reviewTrialApplication({ id, decision, internalReviewNote: note });
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        // The decision always persisted; provisioning may still have failed, and
        // the refreshed page shows that state truthfully with a Retry control.
        router.refresh();
      } catch {
        // Deliberately does NOT claim the decision failed: the action may have
        // committed before the response was lost. Refreshing shows the truth.
        setError("Përgjigja nuk u marr. Rifreskoni faqen për gjendjen aktuale.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Shënim i brendshëm
        <textarea
          className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
        />
      </label>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("approved")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-50 px-4 text-sm font-bold text-emerald-600 hover:bg-emerald-100 disabled:pointer-events-none disabled:opacity-50"
        >
          <Check className="size-4" />
          {pending ? "Duke provizionuar…" : "Aprovo & nis provën 14-ditore"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("rejected")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-50 px-4 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="size-4" />
          Refuzo
        </button>
      </div>
      <p className="text-xs leading-5 text-slate-400">
        Aprovimi krijon një organizatë të re Kornizo, e cakton aplikantin si
        pronar dhe nis provën 14-ditore të Kornizo Standard.
      </p>
    </div>
  );
}

/** Retry provisioning for an approved application whose provisioning failed. */
export function TrialProvisioningRetry({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function retry() {
    setError("");
    startTransition(async () => {
      try {
        const res = await retryTrialApplicationProvisioning({ id });
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        router.refresh();
      } catch {
        setError("Përgjigja nuk u marr. Rifreskoni faqen për gjendjen aktuale.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={retry}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-500/15 px-4 text-sm font-bold text-violet-600 hover:bg-violet-500/20 disabled:pointer-events-none disabled:opacity-50"
      >
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Duke provuar përsëri…" : "Provo provizionimin përsëri"}
      </button>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      <p className="text-xs leading-5 text-slate-400">
        Riprovimi është i sigurt: nuk mund të krijojë organizatë të dytë.
      </p>
    </div>
  );
}

export function DemoStatusControl({ id, status }: { id: string; status: DemoRequestStatus }) {
  const router = useRouter();
  const [value, setValue] = useState<DemoRequestStatus>(status);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        const res = await setDemoRequestStatus({ id, status: value });
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        router.refresh();
      } catch {
        setError("Veprimi nuk u përfundua. Provoni përsëri.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value as DemoRequestStatus)}
        className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
      >
        <option value="new">NEW</option>
        <option value="contacted">CONTACTED</option>
        <option value="closed">CLOSED</option>
      </select>
      <button
        type="button"
        onClick={submit}
        disabled={pending || value === status}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-500/15 px-3 text-sm font-bold text-violet-600 hover:bg-violet-500/20 disabled:pointer-events-none disabled:opacity-50"
      >
        Ruaj
      </button>
      {error ? <span className="text-sm font-semibold text-rose-600">{error}</span> : null}
    </div>
  );
}
