"use client";

import { useState } from "react";
import {
  LifeBuoy,
  X,
  Search,
  ChevronDown,
  Clock,
  Rocket,
  CheckCircle2,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/providers";
import { faqItems, guideGroups } from "@/lib/plan";
import { Button } from "@/components/ui/kit";

function DrawerShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-slate-100 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function HelpDrawer() {
  const { overlay, setOverlay, toast } = useApp();
  const [tab, setTab] = useState<"faq" | "contact">("faq");
  const [open, setOpen] = useState<number | null>(null);

  return (
    <DrawerShell open={overlay === "help"} onClose={() => setOverlay(null)}>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white/15">
              <LifeBuoy className="size-6" />
            </span>
            <div>
              <div className="font-heading text-lg font-bold">
                Qendra e Ndihmës
              </div>
              <div className="text-sm text-white/80">Jemi këtu për ju</div>
            </div>
          </div>
          <button
            onClick={() => setOverlay(null)}
            aria-label="Mbyll"
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4 flex gap-2 rounded-xl bg-white/10 p-1">
          {(
            [
              ["faq", "Pyetjet e shpeshta"],
              ["contact", "Na kontaktoni"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                tab === v ? "bg-white text-indigo-600" : "text-white/85",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "faq" ? (
          <>
            <div className="mb-3 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400">
              <Search className="size-4" />
              <span className="text-sm">Kërko një pyetje…</span>
            </div>
            <ul className="space-y-2">
              {faqItems.map((q, i) => (
                <li key={i}>
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-200/40"
                  >
                    <span>{q}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-slate-400 transition-transform",
                        open === i && "rotate-180",
                      )}
                    />
                  </button>
                  {open === i && (
                    <p className="px-4 py-3 text-sm text-slate-400">
                      Ndiqni udhëzuesin hap-pas-hapi brenda aplikacionit. Ky
                      është një demonstrim lokal — përgjigjet e plota shfaqen te
                      versioni i plotë.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Na shkruani dhe do t&apos;ju kthehemi brenda 24 orëve.
            </p>
            <Button
              className="w-full"
              onClick={() => toast("Kërkesa u dërgua (demo lokale).")}
            >
              Dërgo mesazh
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast("Kërko përmirësim — demo lokale.")}
            >
              Kërko përmirësim
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-400">
        <Clock className="size-4 text-emerald-500" />
        <div>
          <div className="font-semibold text-slate-700">Orari i mbështetjes</div>
          Çdo ditë, përfshirë të dielën · 08:00 – 00:00
        </div>
      </div>
    </DrawerShell>
  );
}

export function ConfigGuideDrawer() {
  const { overlay, setOverlay, toast } = useApp();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <DrawerShell open={overlay === "config"} onClose={() => setOverlay(null)}>
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white/15">
              <Rocket className="size-6" />
            </span>
            <div>
              <div className="font-heading text-lg font-bold">
                Udhëzuesi i konfigurimit
              </div>
              <div className="text-sm text-white/80">Gjithçka gati</div>
            </div>
          </div>
          <button
            onClick={() => setOverlay(null)}
            aria-label="Mbyll"
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-full bg-white" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {guideGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="mb-2 px-1 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              {group.label}
            </div>
            <ul className="space-y-2">
              {group.steps.map((step) => {
                const key = group.label + step;
                return (
                  <li key={key}>
                    <button
                      onClick={() => setOpen(open === key ? null : key)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-left hover:bg-slate-200/40"
                    >
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                      <span className="flex-1 text-sm font-semibold text-slate-500 line-through">
                        {step}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-slate-400 transition-transform",
                          open === key && "rotate-180",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm">
        <button
          onClick={() => {
            toast("U fsheh deri nesër.");
            setOverlay(null);
          }}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900"
        >
          <Clock className="size-4" /> Fshihe deri nesër
        </button>
        <button
          onClick={() => {
            toast("Nuk do të shfaqet më.");
            setOverlay(null);
          }}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900"
        >
          <EyeOff className="size-4" /> Mos e shfaq më
        </button>
      </div>
    </DrawerShell>
  );
}
