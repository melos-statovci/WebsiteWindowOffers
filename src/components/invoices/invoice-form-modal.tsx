"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, ReceiptText, Plus, Trash2, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button, Field, Input, Label } from "@/components/ui/kit";
import { useStore } from "@/lib/store";
import { useApp } from "@/components/providers/providers";
import { eur } from "@/lib/format";
import { projectTotal } from "@/lib/selectors";
import type { InvoiceLine, InvoiceStatus } from "@/types";

const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const clampNumber = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
const intFromInput = (value: string, min: number, max: number) =>
  clampNumber(parseInt(value, 10), min, max);
const decimalFromInput = (value: string, min: number, max: number) =>
  clampNumber(parseFloat(value.replace(",", ".")), min, max);

export function InvoiceFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { toast } = useApp();
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const company = useStore((s) => s.company);
  const addInvoice = useStore((s) => s.addInvoice);

  const acceptedOffers = useMemo(
    () => projects.filter((p) => p.status === "Pranuar" && !p.archived),
    [projects],
  );

  const [step, setStep] = useState<"choose" | "form">("choose");
  const [clientId, setClientId] = useState("");
  const [reference, setReference] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [issuedAt, setIssuedAt] = useState(today);
  const [dueAt, setDueAt] = useState(addDays(today, 15));
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
       
      setStep("choose");
      setClientId(clients[0]?.id ?? "");
      setReference("");
      setIssuedAt(today);
      setDueAt(addDays(today, 15));
      setStatus("Draft");
      setLines([{ description: "", qty: 1, unitPrice: 0 }]);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startBlank = () => {
    setStep("form");
    setLines([{ description: "", qty: 1, unitPrice: 0 }]);
  };
  const startFromOffer = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setClientId(p.clientId);
    setReference(p.number);
    setLines(p.items.map((it) => ({ description: `${it.label} · ${it.widthMm}×${it.heightMm}mm`, qty: it.qty, unitPrice: it.unitPrice })));
    setStep("form");
  };

  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { description: "", qty: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const net = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  const submit = () => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return setError("Zgjidhni një klient.");
    const valid = lines.filter((l) => l.description.trim() && l.qty > 0);
    if (valid.length === 0) return setError("Shtoni të paktën një pozicion me përshkrim dhe sasi.");
    const id = addInvoice({
      clientId: client.id,
      clientName: client.name,
      reference: reference || undefined,
      issuedAt,
      dueAt,
      status,
      vatRate: company.vatDefault / 100,
      lines: valid,
    });
    toast("Fatura u krijua.");
    onClose();
    onCreated(id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Faturë e re"
      size="lg"
      footer={
        step === "form" ? (
          <>
            <Button variant="ghost" onClick={() => setStep("choose")}>Prapa</Button>
            <Button onClick={submit}>Krijo faturën</Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>Anulo</Button>
        )
      }
    >
      {step === "choose" && (
        <div className="space-y-3">
          <button onClick={startBlank} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-200/40">
            <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-500"><ReceiptText className="size-5" /></span>
            <span className="flex-1">
              <span className="block font-semibold text-slate-900">Faturë bosh</span>
              <span className="block text-sm text-slate-400">Pozicionet shkruhen me dorë (servis, riparim…)</span>
            </span>
            <ChevronRight className="size-4 text-slate-400" />
          </button>
          {acceptedOffers.length > 0 && (
            <>
              <div className="px-1 pt-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">Nga një ofertë e pranuar</div>
              {acceptedOffers.map((p) => (
                <button key={p.id} onClick={() => startFromOffer(p.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-200/40">
                  <span className="grid size-10 place-items-center rounded-lg bg-slate-200 text-slate-900"><FileText className="size-5" /></span>
                  <span className="flex-1">
                    <span className="block font-semibold text-slate-900">{p.number} · {p.clientName}</span>
                    <span className="block text-sm text-slate-400">{p.items.length} pozicione</span>
                  </span>
                  <span className="font-heading font-semibold text-slate-900">{eur(projectTotal(p))}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {step === "form" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Klienti *</Label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Referenca"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="P.sh. OF-2026-0142" /></Field>
            <Field label="Lëshuar"><Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} /></Field>
            <Field label="Afati i pagesës"><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field>
            <div>
              <Label>Statusi</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500">
                {(["Draft", "Dërguar", "Paguar", "Vonesë", "Anuluar"] as InvoiceStatus[]).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Pozicionet</Label>
            <div className="mt-2 space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Përshkrimi" className="flex-1" />
                  <Input value={String(l.qty)} onChange={(e) => setLine(i, { qty: intFromInput(e.target.value, 0, 999) })} className="w-16 text-center" inputMode="numeric" min={0} max={999} aria-label="Sasia" />
                  <Input value={String(l.unitPrice)} onChange={(e) => setLine(i, { unitPrice: decimalFromInput(e.target.value, 0, 1_000_000) })} className="w-24 text-right" inputMode="decimal" min={0} aria-label="Çmimi" />
                  <button onClick={() => removeLine(i)} disabled={lines.length === 1} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40" aria-label="Hiq pozicionin"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addLine} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:underline"><Plus className="size-4" /> Shto pozicion</button>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-200/50 px-4 py-3 text-sm">
            <span className="text-slate-500">Nëntotali (pa TVSH)</span>
            <span className="font-heading font-semibold text-slate-900">{eur(net)}</span>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
