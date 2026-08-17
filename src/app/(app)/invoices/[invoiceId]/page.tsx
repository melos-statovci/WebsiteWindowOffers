"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileDown, Check, Receipt, Trash2, Plus, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Button, Card, Badge, EmptyState } from "@/components/ui/kit";
import { PaymentModal, type PaymentDraft } from "@/components/clients/payment-modal";
import { useStore } from "@/lib/store";
import { eurAfter, shortDate } from "@/lib/format";
import { invoiceNet, invoicePaid, invoiceOutstanding, invoicePaymentState, isOverdue } from "@/domain/finance/selectors";
import { printInvoice } from "@/lib/print";
import { setInvoiceStatus, deleteInvoice } from "@/server/actions/invoice.action";
import { recordInvoicePayment, markInvoicePaid } from "@/server/actions/payment.action";
import { useApp } from "@/components/providers/providers";
import type { InvoiceStatus } from "@/domain/types";

const statusTone: Record<InvoiceStatus, "neutral" | "blue" | "emerald" | "rose" | "amber"> = {
  Draft: "neutral", Dërguar: "blue", Paguar: "emerald", Vonesë: "rose", Anuluar: "amber",
};
// Workflow statuses the user sets by hand. "Paguar" is intentionally absent:
// paid state is derived from recorded payments, never set manually (that is what
// used to allow duplicate full-value payments).
// "Paguar" (payment-derived) and "Vonesë" (overdue, due-date-derived) are never
// set by hand.
type SettableStatus = Exclude<InvoiceStatus, "Paguar" | "Vonesë">;
const WORKFLOW_STATUSES: SettableStatus[] = ["Draft", "Dërguar", "Anuluar"];

export default function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params);
  const router = useRouter();
  const { toast, confirm } = useApp();
  const inv = useStore((s) => s.invoices.find((i) => i.id === invoiceId));
  const company = useStore((s) => s.company);
  const payments = useStore((s) => s.payments);
  const project = useStore((s) => s.projects.find((p) => p.id === inv?.projectId));
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!inv) {
    return (
      <div>
        <BackLink onClick={() => router.push("/invoices")} />
        <Card>
          <EmptyState icon={Receipt} title="Fatura nuk u gjet" description={`Nuk ekziston asnjë faturë me ID “${invoiceId}”.`}
            action={<Button onClick={() => router.push("/invoices")}>Kthehu te Faturat</Button>} />
        </Card>
      </div>
    );
  }

  const net = invoiceNet(inv);
  const vat = net * inv.vatRate;
  const total = net + vat;
  const paid = invoicePaid(inv.id, payments);
  const outstanding = invoiceOutstanding(inv, payments);
  const payState = invoicePaymentState(inv, payments);
  const isSettled = payState === "paid" || payState === "overpaid";
  const canPay = inv.status !== "Anuluar" && outstanding > 0.005;
  // A hard delete is only for a Draft/Cancelled invoice with no payments; anything
  // else must be cancelled (mirrors the server rule so the button never lies).
  const deletable = (inv.status === "Draft" || inv.status === "Anuluar") && paid <= 0.005;
  const overdue = isOverdue(inv, payments);

  // Frozen issuer identity (falls back to the live profile only for a legacy
  // pre-snapshot invoice), matching what printInvoice renders.
  const cs = inv.companySnapshot;
  const issuer = {
    name: cs?.name ?? company.name,
    address: cs?.address ?? company.address,
    phone: cs?.phone ?? company.phone,
    nui: cs?.nui ?? company.nui,
  };

  const changeStatus = async (status: SettableStatus) => {
    setBusy(true);
    const res = await setInvoiceStatus({ id: inv.id, status });
    setBusy(false);
    if (!res.ok) return toast(res.error.message);
    toast("Statusi u përditësua.");
    router.refresh();
  };

  // Idempotent server-side: settles only the REMAINING balance under a row lock,
  // so it can never create a duplicate full-value payment even on double-click.
  const markPaid = async () => {
    setBusy(true);
    const res = await markInvoicePaid({ invoiceId: inv.id });
    setBusy(false);
    if (!res.ok) return toast(res.error.message);
    toast(res.data.created ? "Fatura u shlye plotësisht dhe pagesa u regjistrua." : "Fatura ishte tashmë e paguar.");
    router.refresh();
  };

  const submitPayment = async (d: PaymentDraft & { allowCredit?: boolean }) => {
    setBusy(true);
    const res = await recordInvoicePayment({ invoiceId: inv.id, amount: d.amount, date: d.date, method: d.method, note: d.note || undefined, allowCredit: d.allowCredit });
    setBusy(false);
    if (!res.ok) { toast(res.error.message); return; }
    setPayOpen(false);
    toast(res.data.credit ? `Pagesa u regjistrua. Kredi klienti: ${res.data.credit.toFixed(2)} €.` : res.data.paidInFull ? "Fatura u shlye plotësisht." : "Pagesa u regjistrua.");
    router.refresh();
  };

  const remove = async () => {
    const ok = await confirm({ title: "Fshi faturën?", message: `“${inv.number}” do të fshihet përgjithmonë.`, confirmLabel: "Fshi", danger: true });
    if (!ok) return;
    const res = await deleteInvoice({ id: inv.id });
    if (!res.ok) return toast(res.error.message);
    toast("Fatura u fshi.");
    router.push("/invoices");
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={() => router.push("/invoices")} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => printInvoice(inv, company)}><Printer className="size-4" /> Printo</Button>
          <Button variant="outline" onClick={() => printInvoice(inv, company)}><FileDown className="size-4" /> PDF</Button>
          {canPay && <Button variant="outline" disabled={busy} onClick={() => setPayOpen(true)}><Plus className="size-4" /> Shto pagesë</Button>}
          {canPay && <Button disabled={busy} onClick={markPaid}><Check className="size-4" /> Shëno të paguar</Button>}
          {deletable && <button onClick={remove} disabled={busy} className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-60" aria-label="Fshi faturën"><Trash2 className="size-4" /></button>}
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="font-heading text-2xl font-bold text-slate-900">Faturë {inv.number}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span>Referencë: {inv.reference ?? "—"}</span>
              {project && (
                <Link href={`/projects/${project.id}/configure`} className="inline-flex items-center gap-1 rounded-md bg-slate-200/60 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
                  <FolderOpen className="size-3.5" /> {project.number}
                </Link>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isSettled ? (
                <Badge tone="emerald">{payState === "overpaid" ? "Paguar (mbipagesë)" : "Paguar"}</Badge>
              ) : (
                <>
                  <select value={inv.status} disabled={busy} onChange={(e) => changeStatus(e.target.value as SettableStatus)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-neutral-500 disabled:opacity-60">
                    {WORKFLOW_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
                  {overdue && <Badge tone="rose">Vonesë</Badge>}
                  {payState === "partial" && <Badge tone="amber">Pjesërisht e paguar</Badge>}
                </>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-heading font-semibold text-slate-900">{issuer.name}</div>
            <div className="text-slate-400">{issuer.address}</div>
            <div className="text-slate-400">{issuer.phone}</div>
            <div className="mt-2 text-slate-400">NUI {issuer.nui}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-3">
          <Field label="Klienti" value={inv.clientName} />
          <Field label="Lëshuar" value={shortDate(inv.issuedAt)} />
          <Field label="Afati" value={shortDate(inv.dueAt)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                <th className="py-3 pr-4">Përshkrimi</th>
                <th className="py-3 pr-4 text-right">Sasia</th>
                <th className="py-3 pr-4 text-right">Çmimi</th>
                <th className="py-3 text-right">Totali</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-3 pr-4 text-slate-700">{l.description}</td>
                  <td className="py-3 pr-4 text-right text-slate-500">{l.qty}</td>
                  <td className="py-3 pr-4 text-right text-slate-500">{eurAfter(l.unitPrice)}</td>
                  <td className="py-3 text-right font-semibold text-slate-900">{eurAfter(l.qty * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <Row label="Nëntotali" value={eurAfter(net)} />
            <Row label={`TVSH (${Math.round(inv.vatRate * 100)}%)`} value={`+${eurAfter(vat)}`} />
            <div className="flex items-center justify-between rounded-lg bg-slate-200/60 px-3 py-2">
              <dt className="font-heading font-semibold text-slate-900">TOTALI</dt>
              <dd className="font-heading text-lg font-bold text-slate-900">{eurAfter(total)}</dd>
            </div>
            {paid > 0.005 && (
              <div className="space-y-2 pt-1">
                <Row label="Paguar" value={`−${eurAfter(paid)}`} />
                <div className="flex items-center justify-between px-3">
                  <dt className="font-semibold text-slate-700">Mbetje për pagesë</dt>
                  <dd className={`font-heading font-bold ${outstanding > 0.005 ? "text-rose-500" : "text-emerald-500"}`}>{eurAfter(outstanding)}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Pagesa: 50% paradhënie në konfirmim, 50% para montimit. · {company.bank} · IBAN {company.iban}
        </div>
      </Card>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSubmit={submitPayment}
        suggestedAmount={outstanding > 0.005 ? outstanding : undefined}
        maxAmount={outstanding > 0.005 ? outstanding : undefined}
        allowCreditToggle
      />
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
      <ArrowLeft className="size-4" /> Kthehu te Faturat
    </button>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
