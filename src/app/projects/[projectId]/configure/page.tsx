"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Undo2,
  Printer,
  Plus,
  Pencil,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";
import { Button, Avatar, Toggle, EmptyState } from "@/components/ui/kit";
import { projects } from "@/lib/mock/data";
import { eur, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OfferItem } from "@/types";

type Step = "detajet" | "produkti" | "permbledhje";

function WindowGlyph({ item }: { item: OfferItem }) {
  const wide = item.widthMm >= item.heightMm;
  return (
    <svg viewBox="0 0 40 48" className="size-full text-slate-400">
      <rect x="3" y="3" width="34" height="42" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="6" width="28" height="36" fill="currentColor" opacity="0.12" />
      {wide ? (
        <line x1="20" y1="6" x2="20" y2="42" stroke="currentColor" strokeWidth="1" />
      ) : (
        <line x1="6" y1="24" x2="34" y2="24" stroke="currentColor" strokeWidth="1" />
      )}
      <line x1="31" y1="10" x2="31" y2="20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function ConfigurePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const [step, setStep] = useState<Step>("permbledhje");

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100">
          <EmptyState
            icon={X}
            title="Projekti nuk u gjet"
            description={`Nuk ekziston asnjë projekt me ID “${projectId}”.`}
            action={<Button onClick={() => router.push("/projects")}>Kthehu te Projektet</Button>}
          />
        </div>
      </div>
    );
  }

  const net = project.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const vat = net * project.vatRate;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1">
          <button
            onClick={() => router.push("/projects")}
            className="grid size-8 place-items-center rounded-lg text-slate-700 hover:bg-slate-300"
            aria-label="Mbyll"
          >
            <X className="size-4" />
          </button>
          <button
            className="grid size-8 place-items-center rounded-lg text-slate-400"
            aria-label="Kthe pas"
          >
            <Undo2 className="size-4" />
          </button>
        </div>

        {/* Centered tabs */}
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-200/60 p-1">
          {(
            [
              ["detajet", "Detajet"],
              ["produkti", "Produkti"],
              ["permbledhje", "Përmbledhje"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setStep(v)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                step === v ? "bg-slate-50 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step === "produkti" ? (
            <>
              <Button size="sm" variant="subtle"><Pencil className="size-4" /> Edit</Button>
              <button className="grid size-9 place-items-center rounded-full bg-slate-200/70 text-slate-700 hover:bg-slate-300" aria-label="Shto">
                <Plus className="size-5" />
              </button>
            </>
          ) : (
            <button className="grid size-9 place-items-center rounded-full bg-slate-200/70 text-slate-700 hover:bg-slate-300" aria-label="Printo">
              <Printer className="size-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-16">
        {step === "detajet" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("produkti")}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" /> Kthehu te Oferta ({project.items.length})
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Klienti</div>
              <div className="mt-2 flex items-center gap-3">
                <Avatar initial={initials(project.clientName)} className="size-10 rounded-lg text-sm" />
                <span className="font-semibold text-slate-900">{project.clientName}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Profili</div>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sistemi i profilit</span>
                  <span className="font-semibold text-slate-900">{project.profileSystem}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ngjyra e profilit</span>
                  <span className="font-semibold text-slate-900">{project.profileColor}</span>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep("produkti")}>
              Vazhdo Konfigurimin
            </Button>
          </div>
        )}

        {step === "produkti" && (
          <ul className="space-y-3">
            {project.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-3"
              >
                <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-slate-50 p-2">
                  <WindowGlyph item={item} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  <div className="text-sm text-slate-400">
                    {item.widthMm} × {item.heightMm} mm · {item.qty} copë
                  </div>
                  <div className="font-heading font-semibold text-slate-900">
                    {eur(item.qty * item.unitPrice)}
                  </div>
                </div>
                <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60" aria-label="Opsione">
                  <MoreVertical className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {step === "permbledhje" && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <div className="border-b border-slate-200 p-5">
                <div className="font-heading text-lg font-bold text-slate-900">
                  Përmbledhja e Ofertës
                </div>
                <div className="text-sm text-slate-400">
                  {project.items.length} pozicione · {project.clientName}
                </div>
              </div>
              <div className="divide-y divide-slate-200 text-sm">
                <Row label="Totali" value={eur(net)} muted />
                <Row label={`TVSH (${Math.round(project.vatRate * 100)}%)`} value={`+${eur(vat)}`} muted />
              </div>
              <div className="flex items-center justify-between bg-slate-50 px-5 py-4">
                <span className="font-heading font-semibold text-slate-900">Totali përfundimtar</span>
                <span className="font-heading text-xl font-bold text-slate-900">{eur(net + vat)}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 px-1 text-xs font-bold tracking-widest text-slate-400 uppercase">
                Opsionet
              </div>
              <div className="space-y-2">
                {["Marzha", "Zbritje", "TVSH", "Montimi", "Demontimi", "Transporti"].map((o) => (
                  <OptionRow key={o} label={o} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className={muted ? "text-slate-400" : "text-slate-700"}>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function OptionRow({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4">
      <span className="font-semibold text-slate-900">{label}</span>
      <Toggle checked={on} onChange={setOn} label={label} />
    </div>
  );
}
