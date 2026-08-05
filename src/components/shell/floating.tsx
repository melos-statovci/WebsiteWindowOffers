"use client";

import { useState } from "react";
import { Clock, Rocket, X } from "lucide-react";
import { useApp } from "@/components/providers/providers";

export function FloatingConfig() {
  const { setOverlay } = useApp();
  return (
    <button
      onClick={() => setOverlay("config")}
      className="fixed right-5 bottom-5 z-30 flex items-center gap-3 rounded-full bg-indigo-600 py-2.5 pr-5 pl-2.5 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-[1.02]"
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
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 bg-blue-600 px-4 py-3 text-sm text-white sm:items-center">
      <Clock className="mt-0.5 size-4 shrink-0 sm:mt-0" />
      <p className="flex-1 leading-snug">
        Prova falas: edhe 11 ditë. Proferto është në fazë lansimi dhe
        përmirësohet vazhdimisht — mund të ndodhin ndërprerje të shkurtra. Për
        problem ose sugjerim, hapni{" "}
        <button
          onClick={() => setOverlay("help")}
          className="font-semibold underline underline-offset-2"
        >
          Qendrën e Ndihmës
        </button>
        .
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Mbyll"
        className="rounded p-0.5 text-white/80 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
