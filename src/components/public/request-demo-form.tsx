"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { submitDemoRequest } from "@/server/acquisition.action";
import type { PublicLocale } from "@/lib/public-routing";

const text = {
  sq: {
    eyebrow: "Demo e produktit",
    title: "Kërko një demo",
    description:
      "Dërgoni të dhënat e kontaktit dhe kompanisë dhe do t'ju kontaktojmë për të organizuar demonstrimin. Kjo kërkesë nuk krijon llogari, provë apo qasje në aplikacion.",
    name: "Emri juaj",
    companyName: "Kompania",
    email: "Email biznesi",
    phone: "Telefoni",
    country: "Shteti",
    message: "Çfarë dëshironi të shihni?",
    optional: "opsionale",
    submit: "Dërgo kërkesën",
    loading: "Duke dërguar...",
    success: "Kërkesa për demo u dërgua. Do t'ju kontaktojmë.",
    duplicate: "Kemi tashmë një kërkesë demo të hapur për këtë email. Do t'ju kontaktojmë.",
    generic: "Kërkesa nuk u dërgua. Provoni përsëri.",
  },
  en: {
    eyebrow: "Product demo",
    title: "Request a demo",
    description:
      "Send your contact and company details and we will contact you to arrange the demonstration. This request does not create an account, a trial, or app access.",
    name: "Your name",
    companyName: "Company",
    email: "Business email",
    phone: "Phone",
    country: "Country",
    message: "What would you like to see?",
    optional: "optional",
    submit: "Submit request",
    loading: "Submitting...",
    success: "Demo request sent. We will contact you.",
    duplicate: "We already have an open demo request for this email. We will contact you.",
    generic: "The request was not submitted. Try again.",
  },
} as const;

export function RequestDemoForm({ locale }: { locale: PublicLocale }) {
  const copy = text[locale];
  const [isPending, startTransition] = useTransition();
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    country: locale === "sq" ? "Kosovë" : "",
    message: "",
    website: "",
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      // Guarded for the same reason as the trial form: a server action can
      // REJECT rather than return a typed error (offline, action transport
      // failure, server restart), and an unhandled rejection inside the
      // transition leaves the visitor with no feedback at all.
      try {
        const res = await submitDemoRequest({
          ...form,
          message: form.message || undefined,
          formStartedAt: startedAt,
        });
        if (!res.ok) {
          setError(res.error.message || copy.generic);
          return;
        }
        setSuccess(res.data.duplicate ? copy.duplicate : copy.success);
        setForm((current) => ({ ...current, message: "", website: "" }));
      } catch {
        setError(copy.generic);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid w-full min-w-0 max-w-[calc(100vw-2rem)] gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm sm:max-w-none sm:p-6">
      <input
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        value={form.website}
        onChange={(e) => setForm((v) => ({ ...v, website: e.target.value }))}
        aria-hidden="true"
        name="website"
      />
      <TextInput label={copy.name} value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} autoComplete="name" required />
      <TextInput label={copy.companyName} value={form.companyName} onChange={(v) => setForm((s) => ({ ...s, companyName: v }))} autoComplete="organization" required />
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TextInput label={copy.email} type="email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} autoComplete="email" required />
        <TextInput label={copy.phone} value={form.phone} onChange={(v) => setForm((s) => ({ ...s, phone: v }))} autoComplete="tel" required />
      </div>
      <TextInput label={copy.country} value={form.country} onChange={(v) => setForm((s) => ({ ...s, country: v }))} autoComplete="country-name" required />
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {copy.message} <span className="font-normal text-slate-400">({copy.optional})</span>
        <textarea
          className="min-h-28 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
          value={form.message}
          onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
          maxLength={1000}
        />
      </label>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600">{success}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="public-primary-action inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold uppercase tracking-[0.08em] disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? copy.loading : copy.submit}
        <Send className="size-4" />
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
