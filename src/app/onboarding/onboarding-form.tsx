"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAndActivateOrganization } from "@/auth/actions";
import { authClient } from "@/auth/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button, Field, Input } from "@/components/ui/kit";

export function OnboardingForm() {
  const router = useRouter();
  const [org, setOrg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await createAndActivateOrganization(org);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <AuthCard
      title="Krijoni organizatën tuaj"
      subtitle="Llogaria juaj nuk ka ende një organizatë. Krijoni një për të vazhduar."
      footer={
        <button onClick={() => authClient.signOut().then(() => router.replace("/sign-in"))} className="text-slate-400 hover:text-slate-700">
          Dil
        </button>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Emri i organizatës">
          <Input value={org} onChange={(e) => setOrg(e.target.value)} required placeholder="Kompania ime sh.p.k." />
        </Field>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || org.trim().length < 2}>
          {loading ? "Duke krijuar…" : "Krijo organizatën"}
        </Button>
      </form>
    </AuthCard>
  );
}
