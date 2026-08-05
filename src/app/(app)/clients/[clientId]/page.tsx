"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Phone,
  Mail,
  MapPin,
  Users,
  FileText,
  Wallet,
  Package,
  FolderOpen,
  StickyNote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Card, Badge, Avatar, EmptyState } from "@/components/ui/kit";
import { clients, projects } from "@/lib/mock/data";
import { eur, initials, shortDate } from "@/lib/format";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";

type Tab =
  | "Përmbledhje"
  | "Projektet"
  | "Ofertat"
  | "Pagesat"
  | "Prodhimi"
  | "Dokumentet"
  | "Shënime";

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const router = useRouter();
  const { toast } = useApp();
  const [tab, setTab] = useState<Tab>("Përmbledhje");

  const client = clients.find((c) => c.id === clientId);
  const clientProjects = projects.filter((p) => p.clientId === clientId);

  if (!client) {
    return (
      <div>
        <button
          onClick={() => router.push("/clients")}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" /> Kthehu te Klientët
        </button>
        <Card>
          <EmptyState
            icon={Users}
            title="Klienti nuk u gjet"
            description={`Nuk ekziston asnjë klient me ID “${clientId}”.`}
            action={
              <Button onClick={() => router.push("/clients")}>
                Kthehu te Klientët
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const tabs: { key: Tab; icon: LucideIcon; count?: number }[] = [
    { key: "Përmbledhje", icon: Users },
    { key: "Projektet", icon: FolderOpen, count: clientProjects.length },
    { key: "Ofertat", icon: FileText, count: client.offersTotal },
    { key: "Pagesat", icon: Wallet, count: client.paymentsCount },
    { key: "Prodhimi", icon: Package },
    { key: "Dokumentet", icon: FolderOpen },
    { key: "Shënime", icon: StickyNote },
  ];

  return (
    <div>
      <button
        onClick={() => router.push("/clients")}
        className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Kthehu te Klientët
      </button>

      {/* Header card */}
      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar initial={initials(client.name)} className="size-14 text-lg" />
            <div>
              <h1 className="font-heading text-2xl font-bold text-slate-900">
                {client.name}
              </h1>
              <Badge tone={client.type === "Biznes" ? "indigo" : "neutral"}>
                {client.type}
              </Badge>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-6 sm:justify-end">
            <Metric label="Vlera totale" value={eur(client.totalValue)} />
            <Metric label="Paguar" value={eur(client.paid)} tone="text-emerald-500" />
            <Metric label="Borxhi" value={eur(client.debt)} tone={client.debt > 0 ? "text-rose-400" : undefined} />
            <Button onClick={() => toast("Shto pagesë — demo lokale.")}>
              <Plus className="size-4" /> Shto pagesë
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {tabs.map(({ key, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === key
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900",
            )}
          >
            <Icon className="size-4" />
            {key}
            {count != null && count > 0 && (
              <span
                className={cn(
                  "rounded-md px-1.5 text-xs",
                  tab === key ? "bg-white/20" : "bg-slate-200 text-slate-500",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Përmbledhje" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">
              Informacioni
            </h3>
            <div className="space-y-4">
              <InfoRow icon={Phone} label="Telefoni" value={client.phone} />
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={MapPin} label="Adresa" value={client.address} />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">
              Përmbledhje financiare
            </h3>
            <dl className="divide-y divide-slate-200 text-sm">
              <FinRow label="Oferta gjithsej" value={String(client.offersTotal)} />
              <FinRow label="Të pranuara" value={`${client.offersAccepted} · ${eur(client.totalValue)}`} />
              <FinRow label="Të refuzuara" value={String(client.offersRejected)} />
              <FinRow label="Paguar" value={eur(client.paid)} tone="text-emerald-500" />
              <FinRow label="Borxh i hapur" value={eur(client.debt)} tone="text-rose-400" />
            </dl>
          </Card>
        </div>
      )}

      {tab === "Projektet" && (
        <Card className="overflow-hidden">
          {clientProjects.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Asnjë projekt" />
          ) : (
            <ul className="divide-y divide-slate-200">
              {clientProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}/configure`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-200/40"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {p.number} · {p.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {shortDate(p.createdAt)}
                      </div>
                    </div>
                    <div className="font-heading font-semibold text-slate-900">
                      {eur(p.total)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "Ofertat" && (
        <Card className="overflow-hidden">
          {clientProjects.length === 0 ? (
            <EmptyState icon={FileText} title="Asnjë ofertë" />
          ) : (
            <ul className="divide-y divide-slate-200">
              {clientProjects.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      OF · {p.number}
                    </div>
                    <div className="text-xs text-slate-400">{p.status}</div>
                  </div>
                  <div className="font-heading font-semibold text-slate-900">
                    {eur(p.total)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "Pagesat" && (
        <Card className="overflow-hidden">
          {client.paymentsCount === 0 ? (
            <EmptyState icon={Wallet} title="Asnjë pagesë" />
          ) : (
            <ul className="divide-y divide-slate-200">
              <li className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Pagesë · paradhënie
                  </div>
                  <div className="text-xs text-slate-400">
                    {shortDate(client.createdAt)}
                  </div>
                </div>
                <div className="font-heading font-semibold text-emerald-500">
                  {eur(client.paid)}
                </div>
              </li>
            </ul>
          )}
        </Card>
      )}

      {tab === "Prodhimi" && (
        <Card>
          <EmptyState icon={Package} title="Asnjë punë në prodhim" description="Prodhimi menaxhohet në planin BIZNES." />
        </Card>
      )}
      {tab === "Dokumentet" && (
        <Card>
          <EmptyState icon={FolderOpen} title="Asnjë dokument" />
        </Card>
      )}
      {tab === "Shënime" && (
        <Card className="p-5 sm:p-6">
          <textarea
            defaultValue={client.notes}
            placeholder="Shkruani një shënim për klientin..."
            className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={() => toast("Shënimi u ruajt (demo lokale).")}>
              Ruaj shënimin
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-right">
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </div>
      <div className={cn("font-heading text-lg font-bold text-slate-900", tone)}>
        {value}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg bg-slate-200/70 text-slate-400">
        <Icon className="size-4" />
      </span>
      <div>
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {label}
        </div>
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
