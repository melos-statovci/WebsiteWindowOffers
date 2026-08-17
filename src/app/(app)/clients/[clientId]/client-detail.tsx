"use client";

// Client card. The IDENTITY (name/type/contact) is DB-backed and arrives as a
// prop; edit/delete go through the tenant server actions. Projects/offers
// (Phase 6) and invoices/payments (Phase 7) are also DB-backed — read from the
// store's server-hydrated mirrors, filtered by this client's UUID — so the
// financial summary is server-authoritative. Only Notes remain local; that tab
// still carries a transitional treatment.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Phone, Mail, MapPin, Users, FileText, Wallet,
  Package, FolderOpen, StickyNote, Pencil, Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Card, Badge, Avatar, EmptyState } from "@/components/ui/kit";
import { ClientFormModal, type ClientDraft } from "@/components/clients/client-form-modal";
import { PaymentModal, type PaymentDraft } from "@/components/clients/payment-modal";
import { updateClient, deleteClient } from "@/server/actions/client.action";
import { recordAdvancePayment } from "@/server/actions/payment.action";
import { useStore } from "@/lib/store";
import { eur, initials, shortDate } from "@/lib/format";
import { clientStats, projectTotal } from "@/domain/finance/selectors";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";
import type { Client } from "@/domain/types";

type Tab = "Përmbledhje" | "Projektet" | "Ofertat" | "Pagesat" | "Prodhimi" | "Dokumentet" | "Shënime";

export function ClientDetail({ client, clientId }: { client: Client | null; clientId: string }) {
  const router = useRouter();
  const { toast, confirm } = useApp();

  // Still-local domains (Phase 5+). Filtered by the DB client's UUID.
  const projects = useStore((s) => s.projects);
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const deleteNote = useStore((s) => s.deleteNote);

  const [tab, setTab] = useState<Tab>("Përmbledhje");
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  const activeId = client?.id ?? clientId;
  const clientProjects = useMemo(() => projects.filter((p) => p.clientId === activeId), [projects, activeId]);
  const clientPayments = useMemo(() => payments.filter((p) => p.clientId === activeId), [payments, activeId]);
  const clientNotes = useMemo(() => notes.filter((n) => n.clientId === activeId), [notes, activeId]);
  const stats = useMemo(
    () => clientStats(activeId, projects, invoices, payments),
    [activeId, projects, invoices, payments],
  );

  if (!client) {
    return (
      <div>
        <button onClick={() => router.push("/clients")} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" /> Kthehu te Klientët
        </button>
        <Card>
          <EmptyState icon={Users} title="Klienti nuk u gjet" description="Ky klient nuk ekziston ose nuk i përket organizatës suaj."
            action={<Button onClick={() => router.push("/clients")}>Kthehu te Klientët</Button>} />
        </Card>
      </div>
    );
  }

  const tabs: { key: Tab; icon: LucideIcon; count?: number }[] = [
    { key: "Përmbledhje", icon: Users },
    { key: "Projektet", icon: FolderOpen, count: clientProjects.length },
    { key: "Ofertat", icon: FileText, count: stats.offersTotal },
    { key: "Pagesat", icon: Wallet, count: clientPayments.length },
    { key: "Prodhimi", icon: Package },
    { key: "Dokumentet", icon: FolderOpen },
    { key: "Shënime", icon: StickyNote, count: clientNotes.length },
  ];

  const submitEdit = async (d: ClientDraft) => {
    if (busy) return;
    setBusy(true);
    const res = await updateClient({
      id: client.id,
      name: d.name, type: d.type,
      phone: d.phone, email: d.email, address: d.address, city: d.city, nui: d.nui,
    });
    setBusy(false);
    if (!res.ok) {
      toast(res.error.fieldErrors?.name?.[0] ?? res.error.fieldErrors?.email?.[0] ?? res.error.message);
      return;
    }
    setEditOpen(false);
    toast("Klienti u përditësua.");
    router.refresh();
  };

  const submitPayment = async (d: PaymentDraft) => {
    if (busy) return;
    setBusy(true);
    // An unlinked advance payment (no invoice) -> becomes client credit.
    const res = await recordAdvancePayment({ clientId: client.id, amount: d.amount, date: d.date, method: d.method, note: d.note || undefined });
    setBusy(false);
    if (!res.ok) { toast(res.error.message); return; }
    setPayOpen(false);
    toast(`Pagesa prej ${eur(d.amount)} u regjistrua.`);
    router.refresh();
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Fshi klientin?",
      message: `“${client.name}” do të fshihet nga baza e të dhënave. (Të dhënat demo lokale migrojnë veçmas dhe nuk preken.)`,
      confirmLabel: "Fshi", danger: true,
    });
    if (!ok) return;
    const res = await deleteClient({ id: client.id });
    if (!res.ok) {
      toast(res.error.message);
      return;
    }
    toast("Klienti u fshi.");
    router.push("/clients");
    router.refresh();
  };

  return (
    <div>
      <button onClick={() => router.push("/clients")} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Kthehu te Klientët
      </button>

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar initial={initials(client.name)} className="size-14 text-lg" />
            <div>
              <h1 className="font-heading text-2xl font-bold text-slate-900">{client.name}</h1>
              <Badge tone={client.type === "Biznes" ? "indigo" : "neutral"}>{client.type}</Badge>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-6 sm:justify-end">
            <Metric label="Të faturuara" value={eur(stats.invoicedTotal)} />
            <Metric label="Paguar" value={eur(stats.paid)} tone="text-emerald-500" />
            {stats.availableCredit > 0 ? (
              <Metric label="Kredi" value={eur(stats.availableCredit)} tone="text-emerald-500" />
            ) : (
              <Metric label="Borxhi" value={eur(stats.debt)} tone={stats.debt > 0 ? "text-rose-400" : undefined} />
            )}
            <div className="flex gap-2">
              <Button onClick={() => setPayOpen(true)}>
                <Plus className="size-4" /> Shto pagesë
              </Button>
              <button onClick={() => setEditOpen(true)} className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-200/60 hover:text-slate-900" aria-label="Edito klientin">
                <Pencil className="size-4" />
              </button>
              <button onClick={remove} className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Fshi klientin">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {tabs.map(({ key, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === key ? "border-neutral-500 bg-slate-300 text-white" : "border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900")}>
            <Icon className="size-4" />
            {key}
            {count != null && count > 0 && (
              <span className={cn("rounded-md px-1.5 text-xs", tab === key ? "bg-white/20" : "bg-slate-200 text-slate-500")}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "Përmbledhje" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">Informacioni</h3>
            <div className="space-y-4">
              <InfoRow icon={Phone} label="Telefoni" value={client.phone} />
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={MapPin} label="Adresa" value={client.address} />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-slate-900">Përmbledhje financiare</h3>
            </div>
            <dl className="divide-y divide-slate-200 text-sm">
              <FinRow label="Oferta gjithsej" value={String(stats.offersTotal)} />
              <FinRow label="Të pranuara" value={`${stats.offersAccepted} · ${eur(stats.acceptedValue)}`} />
              <FinRow label="Të faturuara" value={eur(stats.invoicedTotal)} />
              <FinRow label="Paguar" value={eur(stats.paid)} tone="text-emerald-500" />
              <FinRow label="Mbetje faturash" value={eur(stats.outstanding)} tone={stats.outstanding > 0 ? "text-rose-400" : undefined} />
              {stats.availableCredit > 0 && <FinRow label="Kredi klienti" value={eur(stats.availableCredit)} tone="text-emerald-500" />}
              <FinRow label="Borxh i hapur" value={eur(stats.debt)} tone={stats.debt > 0 ? "text-rose-400" : undefined} />
            </dl>
          </Card>
        </div>
      )}

      {(tab === "Projektet" || tab === "Ofertat") && (
        <Card className="overflow-hidden">
          {clientProjects.length === 0 ? (
            <EmptyState icon={tab === "Projektet" ? FolderOpen : FileText} title={tab === "Projektet" ? "Asnjë projekt" : "Asnjë ofertë"} description="Projektet janë ende lokale në këtë fazë." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {clientProjects.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}/configure`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-200/40">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.number} · {p.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {shortDate(p.createdAt)} <Badge tone={p.status === "Pranuar" ? "emerald" : p.status === "Refuzuar" ? "rose" : "blue"}>{p.status}</Badge>
                      </div>
                    </div>
                    <div className="font-heading font-semibold text-slate-900">{eur(projectTotal(p))}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "Pagesat" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <span className="text-sm font-semibold text-slate-500">{clientPayments.length} pagesa · {eur(stats.paid)}</span>
            <Button size="sm" onClick={() => setPayOpen(true)}><Plus className="size-4" /> Shto pagesë</Button>
          </div>
          {clientPayments.length === 0 ? (
            <EmptyState icon={Wallet} title="Asnjë pagesë" />
          ) : (
            <ul className="divide-y divide-slate-200">
              {clientPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{p.method}{p.note ? ` · ${p.note}` : ""}</div>
                    <div className="text-xs text-slate-400">{shortDate(p.date)}</div>
                  </div>
                  <div className="font-heading font-semibold text-emerald-500">{eur(p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "Prodhimi" && (
        <Card><EmptyState icon={Package} title="Asnjë punë në prodhim" description="Prodhimi menaxhohet në planin BIZNES." /></Card>
      )}
      {tab === "Dokumentet" && (
        <Card><EmptyState icon={FolderOpen} title="Asnjë dokument" /></Card>
      )}

      {tab === "Shënime" && (
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Shkruani një shënim për klientin..."
              className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-neutral-500" />
            <div className="mt-3 flex justify-end">
              <Button disabled={!noteText.trim()} onClick={() => { addNote(client.id, noteText.trim()); setNoteText(""); toast("Shënimi u ruajt."); }}>
                Ruaj shënimin
              </Button>
            </div>
          </Card>
          {clientNotes.length > 0 && (
            <Card className="divide-y divide-slate-200 overflow-hidden">
              {clientNotes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm text-slate-700">{n.text}</p>
                    <p className="mt-1 text-xs text-slate-400">{shortDate(n.at)}</p>
                  </div>
                  <button onClick={() => deleteNote(n.id)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Fshi shënimin">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      <ClientFormModal open={editOpen} onClose={() => setEditOpen(false)} onSubmit={submitEdit} initial={client} />
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} onSubmit={submitPayment} suggestedAmount={stats.debt > 0 ? stats.debt : undefined} />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-right">
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
      <div className={cn("font-heading text-lg font-bold text-slate-900", tone)}>{value}</div>
    </div>
  );
}
function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg bg-slate-200/70 text-slate-400"><Icon className="size-4" /></span>
      <div>
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
        <div className="text-sm text-slate-700">{value || "—"}</div>
      </div>
    </div>
  );
}
function FinRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn("font-semibold text-slate-900", tone)}>{value}</dd>
    </div>
  );
}
