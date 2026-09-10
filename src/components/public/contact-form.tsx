"use client";

// General "Contact Kornizo" form.
//
// Distinct from the demo form in intent, not in machinery: both persist as a
// contact_request, this one with `intent = 'general'`. It asks for the least
// that still lets Kornizo reply — who you are, where to reach you, and what you
// are asking — so company and phone are genuinely optional and the message is
// required.
//
// Creates NO Better Auth user, NO organization and NO trial. Reuses the exact
// security controls already proven on the demo form: server-side Zod
// re-validation, length caps, a honeypot plus a minimum form-fill time, and
// duplicate suppression that reports success rather than leaking whether an
// address is already on file.

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { submitGeneralContactRequest } from "@/server/acquisition.action";
import type { PublicLocale } from "@/lib/public-routing";

const text = {
  sq: {
    name: "Emri juaj",
    companyName: "Kompania",
    email: "Email",
    phone: "Telefoni",
    message: "Pyetja juaj",
    optional: "opsionale",
    submit: "Dërgo mesazhin",
    loading: "Duke dërguar...",
    success: "Mesazhi u dërgua. Do t'ju kontaktojmë.",
    duplicate: "Kemi tashmë një mesazh të hapur nga ky email. Do t'ju kontaktojmë.",
    generic: "Mesazhi nuk u dërgua. Provoni përsëri.",
  },
  en: {
    name: "Your name",
    companyName: "Company",
    email: "Email",
    phone: "Phone",
    message: "Your question",
    optional: "optional",
    submit: "Send message",
    loading: "Sending...",
    success: "Message sent. We will get back to you.",
    duplicate: "We already have an open message from this email. We will get back to you.",
    generic: "The message was not sent. Try again.",
  },
} as const;

export function ContactForm({ locale }: { locale: PublicLocale }) {
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
    message: "",
    website: "",
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      // Guarded like every other public submission: a server action can REJECT
      // rather than return a typed error (offline, action transport failure,
      // server restart). An unhandled rejection inside the transition would
      // leave the visitor with no feedback at all.
      try {
        const res = await submitGeneralContactRequest({
          name: form.name,
          // Empty optional fields are sent as undefined, never "".
          companyName: form.companyName || undefined,
          email: form.email,
          phone: form.phone || undefined,
          message: form.message,
          website: form.website,
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
    <form
      onSubmit={submit}
      className="grid w-full min-w-0 max-w-[calc(100vw-2rem)] gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm sm:max-w-none sm:p-6"
    >
      {/* Honeypot: hidden from people, tempting to naive bots. A filled value
          marks the submission as ignored server-side without telling the bot. */}
      <input
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        value={form.website}
        onChange={(e) => setForm((v) => ({ ...v, website: e.target.value }))}
        aria-hidden="true"
        name="website"
      />
      <TextInput
        label={copy.name}
        value={form.name}
        onChange={(v) => setForm((s) => ({ ...s, name: v }))}
        autoComplete="name"
        required
      />
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TextInput
          label={copy.email}
          type="email"
          value={form.email}
          onChange={(v) => setForm((s) => ({ ...s, email: v }))}
          autoComplete="email"
          required
        />
        <TextInput
          label={copy.phone}
          optionalLabel={copy.optional}
          value={form.phone}
          onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
          autoComplete="tel"
        />
      </div>
      <TextInput
        label={copy.companyName}
        optionalLabel={copy.optional}
        value={form.companyName}
        onChange={(v) => setForm((s) => ({ ...s, companyName: v }))}
        autoComplete="organization"
      />
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {copy.message}
        <textarea
          className="min-h-36 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
          value={form.message}
          onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
          maxLength={2000}
          required
        />
      </label>
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600">{success}</p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="public-primary-action inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold tracking-[0.08em] uppercase disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? copy.loading : copy.submit}
        <Send className="size-4" />
      </button>
    </form>
  );
}

function TextInput({
  label,
  optionalLabel,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  optionalLabel?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700">
      <span>
        {label}
        {optionalLabel ? <span className="font-normal text-slate-400"> ({optionalLabel})</span> : null}
      </span>
      <input
        className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        maxLength={180}
      />
    </label>
  );
}
