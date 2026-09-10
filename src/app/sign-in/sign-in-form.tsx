"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/auth/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button, Field, Input, Label } from "@/components/ui/kit";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email: email.trim(), password });
      if (res.error) {
        setError("Email ose fjalëkalim i pasaktë.");
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
      title="Kyçu"
      subtitle="Hyni në llogarinë tuaj Kornizo."
      footer={
        <>
          Nuk keni llogari?{" "}
          <Link href="/request-trial" className="font-semibold text-slate-700 hover:text-slate-900">
            Kërko provë falas
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="ju@kompania.com" />
        </Field>
        <div>
          <Label>Fjalëkalimi</Label>
          <Input className="mt-1.5" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required aria-invalid={!!error} />
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading || !email || !password}>
          {loading ? "Duke u kyçur…" : "Kyçu"}
        </Button>
      </form>
    </AuthCard>
  );
}
