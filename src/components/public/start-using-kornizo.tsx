"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { activateProvisionedOrganization } from "@/server/acquisition.action";

/**
 * "Start using Kornizo" — runs in the APPLICANT'S OWN session.
 *
 * It sends no arguments: the server derives the user from their session, checks
 * their own approved+provisioned application, re-verifies membership, and only
 * then sets the active organization for THIS session. A platform admin never
 * mutates another user's session.
 */
export function StartUsingKornizo({ label, errorLabel }: { label: string; errorLabel: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function start() {
    setError("");
    startTransition(async () => {
      // Guarded: this is the applicant's single door into the product. A
      // rejected action (offline, transport failure) must show the retry
      // message, not silently do nothing.
      try {
        const res = await activateProvisionedOrganization();
        if (!res.ok) {
          setError(res.error.message || errorLabel);
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      } catch {
        setError(errorLabel);
      }
    });
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="public-primary-action inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold disabled:pointer-events-none disabled:opacity-60"
      >
        {label}
        <ArrowRight className="size-4" />
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-500">{error}</p> : null}
    </div>
  );
}
