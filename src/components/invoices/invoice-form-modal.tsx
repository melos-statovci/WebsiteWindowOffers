"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ReceiptText, Plus, Trash2, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button, Field, Input, Label } from "@/components/ui/kit";
import { useStore } from "@/lib/store";
import { useApp } from "@/components/providers/providers";
import { eur } from "@/lib/format";
import { projectTotal } from "@/domain/finance/selectors";
import { createInvoiceFromProject, createManualInvoice } from "@/server/actions/invoice.action";
import type { InvoiceLine, InvoiceStatus } from "@/domain/types";

// Statuses a new invoice may start in ("Paguar" is payment-derived, never manual).
type SettableStatus = Exclude<InvoiceStatus, "Paguar">;
const NEW_STATUSES: SettableStatus[] = ["Draft", "Dërguar", "Vonesë", "Anuluar"];

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
  const router = useRouter();
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const company = useStore((s) => s.company);

  const acceptedOffers = useMemo(
    () => projects.filter((p) => p.status === "Pranuar" && !p.archived),
    [projects],
  );

  const [step, setStep] = useState<"choose" | "form">("choose");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [reference, setReference] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [issuedAt, setIssuedAt] = useState(today);
  const [dueAt, setDueAt] = useState(addDays(today, 15));
  const [status, setStatus] = useState<SettableStatus>("Draft");
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // From-project invoices are SERVER-AUTHORITATIVE: the server snapshots the
  // offer's stored item prices, so the previewed lines/client/reference are shown
  // read-only here (the browser cannot influence the money). Manual invoices keep
  // fully editable lines.
  const fromOffer = projectId !== undefined;

  useEffect(() => {
    if (open) {
       
      setStep("choose");
      setClientId(clients[0]?.id ?? "");
      setProjectId(undefined);
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
    setProjectId(undefined);
    setStep("form");
    setLines([{ description: "", qty: 1, unitPrice: 0 }]);
  };
  const startFromOffer = (pid: string) => {
    const p = projects.find((x) => x.id === pid);
    if (!p) return;
    setClientId(p.clientId);
    setProjectId(p.id);
    setReference(p.number);
    setLines(p.items.map((it) => ({ description: `${it.label} · ${it.widthMm}×${it.heightMm}mm`, qty: it.qty, unitPrice: it.unitPrice })));
    setStep("form");
  };

  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { description: "", qty: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const net = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  const submit = async () => {
    setError("");
    if (dueAt < issuedAt) return setError("Afati i pagesës nuk mund të jetë para datës së lëshimit.");
    setBusy(true);
    const res = fromOffer
      ? // Server loads the authoritative project items + client + VAT and snapshots
        // them; the previewed lines are never trusted as money.
        await createInvoiceFromProject({ projectId: projectId!, issuedAt, dueAt, status })
      : await (async () => {
          const client = clients.find((c) => c.id === clientId);
          if (!client) return { ok: false as const, error: { code: "VALIDATION" as const, message: "Zgjidhni një klient." } };
          const valid = lines.filter((l) => l.description.trim() && l.qty > 0);
          if (valid.length === 0)
            return { ok: false as const, error: { code: "VALIDATION" as const, message: "Shtoni të paktën një pozicion me përshkrim dhe sasi." } };
          return createManualInvoice({
            clientId: client.id,
            issuedAt,
            dueAt,
            status,
            vatRate: company.vatDefault / 100,
            reference: reference || undefined,
            lines: valid,
          });
        })();
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    toast("Fatura u krijua.");
    onClose();
    router.refresh();
    onCreated(res.data.id);
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
            <Button variant="ghost" onClick={() => setStep("choose")} disabled={busy}>Prapa</Button>
            <Button onClick={submit} disabled={busy}>Krijo faturën</Button>
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
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={fromOffer}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500 disabled:opacity-60">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Referenca"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="P.sh. OF-2026-0142" disabled={fromOffer} /></Field>
            <Field label="Lëshuar"><Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} /></Field>
            <Field label="Afati i pagesës"><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field>
            <div>
              <Label>Statusi</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value as SettableStatus)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500">
                {NEW_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">Statusi &ldquo;Paguar&rdquo; vendoset automatikisht kur regjistrohen pagesat.</p>
            </div>
          </div>

          <div>
            <Label>Pozicionet</Label>
            {fromOffer ? (
              <>
                <div className="mt-2 space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="flex-1 text-slate-700">{l.description}</span>
                      <span className="w-12 text-center text-slate-500">×{l.qty}</span>
                      <span className="w-24 text-right font-semibold text-slate-900">{eur(l.unitPrice)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Pozicionet dhe çmimet vijnë nga oferta e pranuar (të garantuara nga serveri) dhe nuk mund të ndryshohen këtu.</p>
              </>
            ) : (
              <>
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
              </>
            )}
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
