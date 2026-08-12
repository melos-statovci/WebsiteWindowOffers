"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/auth/client";
import { createAndActivateOrganization } from "@/auth/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Button, Field, Input, Label } from "@/components/ui/kit";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Fjalëkalimi duhet të ketë të paktën 8 karaktere.");
      return;
    }
    setLoading(true);
    try {
      const res = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
      if (res.error) {
        setError(res.error.message?.includes("exist") ? "Ky email është tashmë i regjistruar." : "Regjistrimi dështoi.");
        return;
      }
      // User is signed in; create their organization (owner) + active + profile.
      const created = await createAndActivateOrganization(org || `${name.trim() || "Kompania"} sh.p.k.`);
      if (!created.ok) {
        // Signed in but org creation failed — the onboarding page recovers this.
        router.replace("/onboarding");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Diçka shkoi keq. Provoni përsëri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Krijo llogari"
      subtitle="Regjistroni kompaninë tuaj në Kornizo."
      footer={
        <>
          Keni llogari?{" "}
          <Link href="/sign-in" className="font-semibold text-slate-700 hover:text-slate-900">
            Kyçu
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Emri juaj">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required placeholder="Emri Mbiemri" />
        </Field>
        <Field label="Emri i kompanisë">
          <Input value={org} onChange={(e) => setOrg(e.target.value)} required placeholder="Kompania ime sh.p.k." />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="ju@kompania.com" />
        </Field>
        <div>
          <Label>Fjalëkalimi</Label>
          <Input className="mt-1.5" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} aria-invalid={!!error} />
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading || !name || !email || !password}>
          {loading ? "Duke u regjistruar…" : "Regjistrohu"}
        </Button>
      </form>
    </AuthCard>
  );
}
