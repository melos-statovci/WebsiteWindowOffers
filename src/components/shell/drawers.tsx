"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  X,
  Search,
  ChevronDown,
  Clock,
  Rocket,
  CheckCircle2,
  Circle,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/providers";
import { faqItems, guideGroups, guideKey, guideStepKeys } from "@/lib/plan";
import { useStore } from "@/lib/store";
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
        className="absolute inset-0 bg-black/55"
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
  const [faqQuery, setFaqQuery] = useState("");
  const [contact, setContact] = useState({ subject: "", message: "" });
  const filteredFaq = faqItems
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.toLowerCase().includes(faqQuery.trim().toLowerCase()));

  return (
    <DrawerShell open={overlay === "help"} onClose={() => setOverlay(null)}>
      <div className="bg-gradient-to-r from-slate-300 to-slate-200 p-5 text-white">
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
                tab === v ? "bg-white text-neutral-700" : "text-white/85",
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
            <div className="mb-3 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search className="size-4 text-slate-400" />
              <input value={faqQuery} onChange={(e) => setFaqQuery(e.target.value)} placeholder="Kërko një pyetje…"
                className="h-full flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none" />
            </div>
            <ul className="space-y-2">
              {filteredFaq.length === 0 && <li className="px-1 py-6 text-center text-sm text-slate-400">Asnjë pyetje për “{faqQuery}”.</li>}
              {filteredFaq.map(({ q, i }) => (
                <li key={i}>
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-200/40"
                  >
                    <span>{q}</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open === i && "rotate-180")} />
                  </button>
                  {open === i && (
                    <p className="px-4 py-3 text-sm text-slate-400">
                      Ndiqni udhëzuesin hap-pas-hapi brenda aplikacionit. Ky është një demonstrim lokal — përgjigjet e plota shfaqen te versioni i plotë.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Na shkruani dhe do t&apos;ju kthehemi brenda 24 orëve.</p>
            <div>
              <label className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Tema</label>
              <input value={contact.subject} onChange={(e) => setContact((c) => ({ ...c, subject: e.target.value }))} placeholder="P.sh. Problem me çmimet"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Mesazhi</label>
              <textarea value={contact.message} onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))} placeholder="Përshkruani çështjen…"
                className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-neutral-500" />
            </div>
            <Button className="w-full" disabled={!contact.subject.trim() || !contact.message.trim()}
              onClick={() => { setContact({ subject: "", message: "" }); toast("Mesazhi u dërgua (simulim lokal — asgjë nuk u dërgua vërtet)."); }}>
              Dërgo mesazh
            </Button>
            <Button variant="outline" className="w-full" onClick={() => toast("Kërko përmirësim — simulim lokal.")}>Kërko përmirësim</Button>
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
  const router = useRouter();
  const { overlay, setOverlay, toast } = useApp();
  const guideDone = useStore((s) => s.guideDone);
  const toggleGuideStep = useStore((s) => s.toggleGuideStep);
  const [open, setOpen] = useState<string | null>(null);

  const total = guideStepKeys.length;
  const done = guideStepKeys.filter((k) => guideDone[k]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const goTo = (href: string) => {
    setOverlay(null);
    router.push(href);
  };

  return (
    <DrawerShell open={overlay === "config"} onClose={() => setOverlay(null)}>
      <div className="bg-gradient-to-r from-slate-300 to-slate-200 p-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white/15">
              <Rocket className="size-6" />
            </span>
            <div>
              <div className="font-heading text-lg font-bold">
                Udhëzuesi i konfigurimit
              </div>
              <div className="text-sm text-white/80">
                {done === total ? "Gjithçka gati" : `${done} nga ${total} hapa`}
              </div>
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
          <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
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
                const key = guideKey(group.label, step.label);
                const isDone = !!guideDone[key];
                return (
                  <li key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => toggleGuideStep(key, !isDone)}
                        aria-label={isDone ? "Shëno të pakryer" : "Shëno të kryer"}
                        className={cn("shrink-0", isDone ? "text-emerald-500" : "text-slate-400 hover:text-slate-600")}
                      >
                        {isDone ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                      </button>
                      <button
                        onClick={() => setOpen(open === key ? null : key)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span className={cn("flex-1 text-sm font-semibold", isDone ? "text-slate-500 line-through" : "text-slate-900")}>
                          {step.label}
                        </span>
                        <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open === key && "rotate-180")} />
                      </button>
                    </div>
                    {open === key && (
                      <div className="border-t border-slate-200 px-4 py-3">
                        <button onClick={() => goTo(step.href)} className="text-sm font-semibold text-slate-900 hover:underline">
                          Hap faqen →
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm">
        <button onClick={() => { toast("U fsheh deri nesër."); setOverlay(null); }} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900">
          <Clock className="size-4" /> Fshihe deri nesër
        </button>
        <button onClick={() => { toast("Nuk do të shfaqet më."); setOverlay(null); }} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900">
          <EyeOff className="size-4" /> Mos e shfaq më
        </button>
      </div>
    </DrawerShell>
  );
}
