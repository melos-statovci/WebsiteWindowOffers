"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/overlay";
import { Button, Field, Input, Label } from "@/components/ui/kit";
import { cn } from "@/lib/utils";
import type { Client, ClientType } from "@/domain/types";

export interface ClientDraft {
  name: string;
  type: ClientType;
  phone: string;
  email: string;
  address: string;
  city: string;
  nui: string;
}

const empty: ClientDraft = {
  name: "",
  type: "Privat",
  phone: "",
  email: "",
  address: "",
  city: "",
  nui: "",
};

export function ClientFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: ClientDraft) => void;
  initial?: Client | null;
}) {
  const [draft, setDraft] = useState<ClientDraft>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(
        initial
          ? {
              name: initial.name,
              type: initial.type,
              phone: initial.phone ?? "",
              email: initial.email ?? "",
              address: initial.address ?? "",
              city: initial.city ?? "",
              nui: initial.nui ?? "",
            }
          : empty,
      );
      setErrors({});
    }
  }, [open, initial]);

  const set = (k: keyof ClientDraft, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const isBiznes = draft.type === "Biznes";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = isBiznes ? "Emri i biznesit është i detyrueshëm." : "Emri i klientit është i detyrueshëm.";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      e.email = "Email-i nuk është i vlefshëm.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({ ...draft, name: draft.name.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edito Klientin" : "Shto Klient të Ri"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Anulo
          </Button>
          <Button onClick={submit}>{initial ? "Ruaj" : "Shto Klientin"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/60 p-1">
          {(["Privat", "Biznes"] as ClientType[]).map((t) => (
            <button
              key={t}
              onClick={() => set("type", t)}
              className={cn(
                "rounded-lg py-2 text-sm font-semibold transition-colors",
                draft.type === t ? "bg-slate-50 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <Label>{isBiznes ? "Emri i biznesit *" : "Emri i klientit *"}</Label>
          <Input
            className="mt-1.5"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={isBiznes ? "P.sh. Ndërtimi Beqiri SH.P.K." : "P.sh. Agim Krasniqi"}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
        </div>

        {isBiznes && (
          <Field label="Numri unik i biznesit (NUI)">
            <Input value={draft.nui} onChange={(e) => set("nui", e.target.value)} placeholder="P.sh. 810123456" />
          </Field>
        )}

        <Field label="Telefoni">
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="P.sh. +383 44 123 456" />
        </Field>
        <div>
          <Label>Email</Label>
          <Input
            className="mt-1.5"
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="P.sh. agim@example.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
        </div>
        <Field label="Adresa">
          <Input value={draft.address} onChange={(e) => set("address", e.target.value)} placeholder="P.sh. Rr. Agim Ramadani, Prishtinë" />
        </Field>
        <Field label="Qyteti">
          <Input value={draft.city} onChange={(e) => set("city", e.target.value)} placeholder="P.sh. Prishtinë" />
        </Field>
      </div>
    </Modal>
  );
}
