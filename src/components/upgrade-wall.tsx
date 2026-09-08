"use client";

import { Clock, Check } from "lucide-react";
import type { GatedInfo } from "@/lib/plan";

export function UpgradeWall({ info }: { info: GatedInfo }) {
  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-slate-200/70 text-slate-400">
          <Clock className="size-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">
          {info.title} nuk është ende i disponueshëm
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          {info.description}
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
          <div className="mb-3 flex items-center gap-2 font-heading font-semibold text-slate-900">
            Kornizo Standard përfshin sot:
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
      </div>
    </div>
  );
}
