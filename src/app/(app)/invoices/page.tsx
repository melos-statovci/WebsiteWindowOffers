"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Receipt, DollarSign, Check, TriangleAlert, Trash2 } from "lucide-react";
import { PageHeader, Button, Card, Badge, EmptyState } from "@/components/ui/kit";
import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import { useStore } from "@/lib/store";
import { eur, shortDate } from "@/lib/format";
import { invoiceTotal, invoicePaid, invoiceOutstanding } from "@/lib/selectors";
import { useApp } from "@/components/providers/providers";
import type { Invoice, InvoiceStatus } from "@/types";

const statusTone: Record<InvoiceStatus, "neutral" | "blue" | "emerald" | "rose" | "amber"> = {
  Draft: "neutral",
  Dërguar: "blue",
  Paguar: "emerald",
  Vonesë: "rose",
  Anuluar: "amber",
};

const STATUSES: (InvoiceStatus | "Të gjitha statuset")[] = [
  "Të gjitha statuset", "Draft", "Dërguar", "Paguar", "Vonesë", "Anuluar",
];

export default function InvoicesPage() {
  const router = useRouter();
  const { toast, confirm } = useApp();
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const deleteInvoice = useStore((s) => s.deleteInvoice);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Të gjitha statuset");
  const [modalOpen, setModalOpen] = useState(false);

  // Tiles reflect real money, not raw status: outstanding = unpaid balance,
  // paid = payments actually received, overdue = outstanding on late invoices.
  const tiles = useMemo(() => {
    let unpaid = 0, paid = 0, overdue = 0;
    for (const inv of invoices) {
      paid += invoicePaid(inv.id, payments);
      const out = invoiceOutstanding(inv, payments);
      unpaid += out;
      if (inv.status === "Vonesë") overdue += out;
    }
    return { unpaid, paid, overdue };
  }, [invoices, payments]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (status !== "Të gjitha statuset" && inv.status !== status) return false;
      if (!query) return true;
      return (
        inv.number.toLowerCase().includes(query) ||
        inv.clientName.toLowerCase().includes(query) ||
        (inv.reference ?? "").toLowerCase().includes(query)
      );
    });
  }, [invoices, q, status]);

  const remove = async (inv: Invoice) => {
    const ok = await confirm({ title: "Fshi faturën?", message: `“${inv.number}” do të fshihet lokalisht.`, confirmLabel: "Fshi", danger: true });
    if (ok) { deleteInvoice(inv.id); toast("Fatura u fshi."); }
  };

  return (
    <div>
      <PageHeader
        title="Faturat"
        subtitle="Krijoni dhe menaxhoni faturat e klientëve"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="size-4" /> Faturë e re</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile icon={DollarSign} tone="bg-amber-50 text-amber-500" label="Të papaguara" value={eur(tiles.unpaid, { symbolAfter: true })} />
        <Tile icon={Check} tone="bg-emerald-50 text-emerald-500" label="Të paguara" value={eur(tiles.paid, { symbolAfter: true })} />
        <Tile icon={TriangleAlert} tone="bg-rose-50 text-rose-400" label="Në vonesë" value={eur(tiles.overdue, { symbolAfter: true })} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3">
          <Search className="size-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kërko faturë, klient ose referencë..."
            className="h-full flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
          className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none">
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="Asnjë faturë ende" description="Krijoni një faturë nga një ofertë e pranuar ose nga e para."
            action={<Button onClick={() => setModalOpen(true)}><Plus className="size-4" /> Faturë e re</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-5 py-3">Numri</th>
                  <th className="px-5 py-3">Klienti</th>
                  <th className="px-5 py-3">Lëshuar</th>
                  <th className="px-5 py-3">Afati</th>
                  <th className="px-5 py-3">Statusi</th>
                  <th className="px-5 py-3 text-right">Totali</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => (
                  <tr key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="cursor-pointer border-b border-slate-200 last:border-0 transition-colors hover:bg-slate-200/40">
                    <td className="px-5 py-4 font-semibold text-slate-900">{inv.number}</td>
                    <td className="px-5 py-4 text-slate-500">{inv.clientName}</td>
                    <td className="px-5 py-4 text-slate-500">{shortDate(inv.issuedAt)}</td>
                    <td className="px-5 py-4 text-slate-500">{shortDate(inv.dueAt)}</td>
                    <td className="px-5 py-4"><Badge tone={statusTone[inv.status]}>{inv.status}</Badge></td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-900">{eur(invoiceTotal(inv), { symbolAfter: true })}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => remove(inv)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Fshi"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InvoiceFormModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(id) => router.push(`/invoices/${id}`)} />
    </div>
  );
}

function Tile({ icon: Icon, tone, label, value }: { icon: React.ComponentType<{ className?: string }>; tone: string; label: string; value: string }) {
  return (
    <Card className="p-5">
      <span className={`mb-3 inline-grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold text-slate-900">{value}</div>
    </Card>
  );
}
