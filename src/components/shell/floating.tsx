"use client";

import { Rocket, X } from "lucide-react";
import { useApp } from "@/components/providers/providers";
import { guideStepKeys } from "@/lib/plan";
import { isUiDismissed, useStore } from "@/lib/store";

export function FloatingConfig() {
  const { setOverlay } = useApp();
  const guideDone = useStore((s) => s.guideDone);
  const uiDismissals = useStore((s) => s.uiDismissals);
  const hydrated = useStore((s) => s._hasHydrated);
  const complete = guideStepKeys.every((key) => guideDone[key]);
  if (!hydrated || complete || isUiDismissed(uiDismissals.configGuide)) return null;

  return (
    <button
      onClick={() => setOverlay("config")}
      className="fixed right-5 bottom-5 z-30 flex items-center gap-3 rounded-full bg-violet-600 py-2.5 pr-5 pl-2.5 text-white shadow-lg shadow-violet-600/25 transition-transform hover:scale-[1.02]"
    >
      <span className="grid size-9 place-items-center rounded-full bg-white/15">
        <Rocket className="size-5" />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-semibold">Konfigurimi</span>
        <span className="block text-xs text-white/80">12 nga 12 hapa</span>
      </span>
    </button>
  );
}

export function TrialBanner() {
  const { setOverlay } = useApp();
  const uiDismissals = useStore((s) => s.uiDismissals);
  const dismissUi = useStore((s) => s.dismissUi);
  const hydrated = useStore((s) => s._hasHydrated);
  if (!hydrated || isUiDismissed(uiDismissals.trialBanner)) return null;

  return (
    <div className="flex flex-wrap items-start gap-3 bg-slate-300 px-4 py-3 text-sm text-white sm:items-center">
      <Rocket className="mt-0.5 size-4 shrink-0 sm:mt-0" />
      <p className="flex-1 leading-snug">
        Kornizo është në fazë lansimi dhe përmirësohet vazhdimisht — mund të
        ndodhin ndërprerje të shkurtra. Për problem ose sugjerim, hapni{" "}
        <button
          onClick={() => setOverlay("help")}
          className="font-semibold underline underline-offset-2"
        >
          Qendrën e Ndihmës
        </button>
        .
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => dismissUi("trialBanner", "forever")}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-white"
        >
          Mos e shfaq më
        </button>
        <button
          onClick={() => dismissUi("trialBanner", "tomorrow")}
          aria-label="Fsheh deri nesër"
          title="Fsheh deri nesër"
          className="rounded p-0.5 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
