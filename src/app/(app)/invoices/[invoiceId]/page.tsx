"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileDown, Check, Receipt, Info } from "lucide-react";
import { Button, Card, Badge, EmptyState } from "@/components/ui/kit";
import { invoices, company } from "@/lib/mock/data";
import { eurAfter, shortDate } from "@/lib/format";
import { useApp } from "@/components/providers/providers";
import type { InvoiceStatus } from "@/types";

const statusTone: Record<InvoiceStatus, "neutral" | "blue" | "emerald" | "rose" | "amber"> = {
  Draft: "neutral",
  Dërguar: "blue",
  Paguar: "emerald",
  Vonesë: "rose",
  Anuluar: "amber",
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const router = useRouter();
  const { toast } = useApp();
  const inv = invoices.find((i) => i.id === invoiceId);

  if (!inv) {
    return (
      <div>
        <BackLink onClick={() => router.push("/invoices")} />
        <Card>
          <EmptyState
            icon={Receipt}
            title="Fatura nuk u gjet"
            description={`Nuk ekziston asnjë faturë me ID “${invoiceId}”.`}
            action={<Button onClick={() => router.push("/invoices")}>Kthehu te Faturat</Button>}
          />
        </Card>
      </div>
    );
  }

  const net = inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const vat = net * inv.vatRate;
  const total = net + vat;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackLink onClick={() => router.push("/invoices")} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast("Printim — demo lokale.")}>
            <Printer className="size-4" /> Printo
          </Button>
          <Button variant="outline" onClick={() => toast("PDF — demo lokale.")}>
            <FileDown className="size-4" /> PDF
          </Button>
          {inv.status !== "Paguar" && (
            <Button onClick={() => toast("Shënuar si e paguar (demo lokale).")}>
              <Check className="size-4" /> Shëno të paguar
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-400">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Pamje lokale (mock) e faturës — llogaria e vërtetë nuk kishte fatura;
          kjo faqe demonstron rrugën <code>/invoices/[invoiceId]</code> me të
          dhëna lokale.
        </span>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="font-heading text-2xl font-bold text-slate-900">
              Faturë {inv.number}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Referencë: {inv.reference ?? "—"}
            </div>
            <div className="mt-3">
              <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-heading font-semibold text-slate-900">
              {company.name}
            </div>
            <div className="text-slate-400">{company.address}</div>
            <div className="text-slate-400">{company.phone}</div>
            <div className="mt-2 text-slate-400">NUI {company.nui}</div>
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
          </dl>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Pagesa: 50% paradhënie në konfirmim, 50% para montimit. · {company.bank} ·{" "}
          IBAN {company.iban}
        </div>
      </Card>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
    >
      <ArrowLeft className="size-4" /> Kthehu te Faturat
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </div>
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
