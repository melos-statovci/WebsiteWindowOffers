"use client";

import { Lock, Sparkles, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/kit";
import { useApp } from "@/components/providers/providers";
import type { GatedInfo } from "@/lib/plan";

export function UpgradeWall({ info }: { info: GatedInfo }) {
  const { toast } = useApp();
  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-slate-200/70 text-slate-400">
          <Lock className="size-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">
          Ky modul nuk është i përfshirë në planin tuaj
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Për ta përdorur këtë funksion, kaloni në planin{" "}
          <span className="font-semibold text-indigo-400">{info.plan}</span>.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
          <div className="mb-3 flex items-center gap-2 font-heading font-semibold text-slate-900">
            <Sparkles className="size-5 text-indigo-400" />
            Plani {info.plan} përfshin:
          </div>
          <ul className="space-y-2.5">
            {info.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-slate-500">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={() => toast("Kërkesa për përmirësim u dërgua (demo lokale).")}
        >
          <MessageCircle className="size-4" />
          Kërko përmirësim
        </Button>
      </div>
    </div>
  );
}
