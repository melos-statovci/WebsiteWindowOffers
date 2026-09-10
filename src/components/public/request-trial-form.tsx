"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { authClient } from "@/auth/client";
import { submitTrialApplication } from "@/server/acquisition.action";
import type { PublicLocale } from "@/lib/public-routing";
import type { TrialApplicationRow } from "@/server/acquisition";

const text = {
  sq: {
    eyebrow: "Provë e plotë 14 ditë",
    title: "Kërko qasje në Kornizo Standard",
    description:
      "Krijoni llogarinë tuaj dhe dërgoni kërkesën e kompanisë. Qasja hapet vetëm pasi kërkesa të aprovohet nga ekipi i Kornizo.",
    review: "Aprovimi kërkohet para qasjes në tenant.",
    full: "Nëse aprovohet, prova përfshin përvojën e plotë Kornizo Standard.",
    account: "Llogaria",
    company: "Kompania",
    name: "Emri juaj",
    email: "Email biznesi",
    password: "Fjalëkalimi",
    confirm: "Konfirmo fjalëkalimin",
    companyName: "Emri i kompanisë",
    phone: "Telefoni",
    country: "Shteti",
    companySize: "Madhësia",
    offers: "Oferta në muaj",
    message: "Mesazh",
    optional: "opsionale",
    submit: "Dërgo kërkesën",
    loading: "Duke dërguar...",
    existing: "Kërkesa juaj ekziston tashmë.",
    status: "Shiko statusin",
    hasAccess: "Kjo llogari ka tashmë qasje në Kornizo.",
    dashboard: "Hap aplikacionin",
    signedInAs: "Jeni të kyçur si",
    signInHint: "Keni llogari? Kyçuni dhe kthehuni këtu për të dërguar kërkesën.",
    passwordMin: "Fjalëkalimi duhet të ketë të paktën 8 karaktere.",
    passwordMismatch: "Fjalëkalimet nuk përputhen.",
    signupFailed: "Regjistrimi nuk u krye. Nëse keni llogari, kyçuni dhe provoni përsëri.",
    generic: "Kërkesa nuk u dërgua. Provoni përsëri.",
    success: "Kërkesa u pranua.",
  },
  en: {
    eyebrow: "Full 14-day trial",
    title: "Request access to Kornizo Standard",
    description:
      "Create your account and submit the company application. Tenant access opens only after the Kornizo team approves the request.",
    review: "Approval is required before tenant access.",
    full: "If approved, the trial includes the full Kornizo Standard experience.",
    account: "Account",
    company: "Company",
    name: "Your name",
    email: "Business email",
    password: "Password",
    confirm: "Confirm password",
    companyName: "Company name",
    phone: "Phone",
    country: "Country",
    companySize: "Company size",
    offers: "Offers per month",
    message: "Message",
    optional: "optional",
    submit: "Submit request",
    loading: "Submitting...",
    existing: "Your application already exists.",
    status: "View status",
    hasAccess: "This account already has Kornizo access.",
    dashboard: "Open app",
    signedInAs: "Signed in as",
    signInHint: "Already have an account? Sign in, then return here to submit the application.",
    passwordMin: "Password must be at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    signupFailed: "Sign-up did not finish. If you already have an account, sign in and try again.",
    generic: "The request was not submitted. Try again.",
    success: "Request accepted.",
  },
} as const;

const sizes = [
  { value: "1-5", label: "1-5" },
  { value: "6-15", label: "6-15" },
  { value: "16-50", label: "16-50" },
  { value: "51+", label: "51+" },
] as const;

export function RequestTrialForm({
  locale,
  signedInUser,
  application,
  hasTenantAccess,
}: {
  locale: PublicLocale;
  signedInUser: { name: string; email: string } | null;
  application: TrialApplicationRow | null;
  hasTenantAccess: boolean;
}) {
  const copy = text[locale];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [account, setAccount] = useState({ name: "", email: "", password: "", confirm: "" });
  const [company, setCompany] = useState({
    companyName: "",
    phone: "",
    country: locale === "sq" ? "Kosovë" : "",
    companySize: "1-5",
    offersPerMonth: "",
    message: "",
    website: "",
  });

  const statusHref = locale === "en" ? "/en/application-status" : "/application-status";
  const disabled = isPending || Boolean(application) || hasTenantAccess;
  const userLabel = useMemo(() => signedInUser ? `${signedInUser.name} · ${signedInUser.email}` : "", [signedInUser]);

  if (hasTenantAccess) {
    return (
      <StateBox title={copy.hasAccess}>
        <Link href="/dashboard" className="public-primary-action inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-bold">
          {copy.dashboard}
        </Link>
      </StateBox>
    );
  }

  if (application) {
    return (
      <StateBox title={copy.existing}>
        <Link href={statusHref} className="public-primary-action inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-bold">
          {copy.status}
        </Link>
      </StateBox>
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!signedInUser) {
      if (account.password.length < 8) {
        setError(copy.passwordMin);
        return;
      }
      if (account.password !== account.confirm) {
        setError(copy.passwordMismatch);
        return;
      }
    }

    startTransition(async () => {
      if (!signedInUser) {
        const signUp = await authClient.signUp.email({
          name: account.name.trim(),
          email: account.email.trim(),
          password: account.password,
        });
        if (signUp.error) {
          setError(copy.signupFailed);
          return;
        }
      }
      const res = await submitTrialApplication({
        companyName: company.companyName,
        phone: company.phone,
        country: company.country,
        companySize: company.companySize as "1-5" | "6-15" | "16-50" | "51+",
        offersPerMonth: company.offersPerMonth ? Number(company.offersPerMonth) : undefined,
        message: company.message || undefined,
        website: company.website,
        formStartedAt: startedAt,
      });
      if (!res.ok) {
        setError(res.error.message || copy.generic);
        return;
      }
      if (res.data.ignored) {
        setSuccess(copy.success);
        return;
      }
      router.replace(statusHref);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid w-full min-w-0 max-w-[calc(100vw-2rem)] gap-5 rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm sm:max-w-none sm:p-6">
      <input
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        value={company.website}
        onChange={(e) => setCompany((v) => ({ ...v, website: e.target.value }))}
        aria-hidden="true"
        name="website"
      />
      {!signedInUser ? (
        <fieldset className="grid min-w-0 gap-4">
          <legend className="font-heading text-base font-bold text-slate-950">{copy.account}</legend>
          <TextInput label={copy.name} value={account.name} onChange={(v) => setAccount((s) => ({ ...s, name: v }))} autoComplete="name" required />
          <TextInput label={copy.email} type="email" value={account.email} onChange={(v) => setAccount((s) => ({ ...s, email: v }))} autoComplete="email" required />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <TextInput label={copy.password} type="password" value={account.password} onChange={(v) => setAccount((s) => ({ ...s, password: v }))} autoComplete="new-password" required minLength={8} />
            <TextInput label={copy.confirm} type="password" value={account.confirm} onChange={(v) => setAccount((s) => ({ ...s, confirm: v }))} autoComplete="new-password" required minLength={8} />
          </div>
          <p className="text-xs leading-5 text-slate-400">{copy.signInHint}</p>
        </fieldset>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
          {copy.signedInAs} <span className="font-semibold text-slate-900">{userLabel}</span>
        </p>
      )}
      <fieldset className="grid min-w-0 gap-4">
        <legend className="font-heading text-base font-bold text-slate-950">{copy.company}</legend>
        <TextInput label={copy.companyName} value={company.companyName} onChange={(v) => setCompany((s) => ({ ...s, companyName: v }))} autoComplete="organization" required />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <TextInput label={copy.phone} value={company.phone} onChange={(v) => setCompany((s) => ({ ...s, phone: v }))} autoComplete="tel" required />
          <TextInput label={copy.country} value={company.country} onChange={(v) => setCompany((s) => ({ ...s, country: v }))} autoComplete="country-name" required />
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            {copy.companySize}
            <select
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
              value={company.companySize}
              onChange={(e) => setCompany((s) => ({ ...s, companySize: e.target.value }))}
            >
              {sizes.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
            </select>
          </label>
          <TextInput label={`${copy.offers} (${copy.optional})`} type="number" min={0} max={100000} value={company.offersPerMonth} onChange={(v) => setCompany((s) => ({ ...s, offersPerMonth: v }))} />
        </div>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          {copy.message} <span className="font-normal text-slate-400">({copy.optional})</span>
          <textarea
            className="min-h-28 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
            value={company.message}
            onChange={(e) => setCompany((s) => ({ ...s, message: e.target.value }))}
            maxLength={1000}
          />
        </label>
      </fieldset>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600">{success}</p> : null}
      <button
        type="submit"
        disabled={disabled}
        className="public-primary-action inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold uppercase tracking-[0.08em] disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? copy.loading : copy.submit}
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      {label}
      <input
        {...props}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
      />
    </label>
  );
}

function StateBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full min-w-0 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-slate-100 p-6 shadow-sm sm:max-w-none">
      <div className="mb-4 flex items-center gap-3">
        <CheckCircle2 className="size-5 text-emerald-500" />
        <h2 className="font-heading text-lg font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}
