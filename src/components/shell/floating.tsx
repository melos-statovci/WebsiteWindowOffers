"use client";

import { Rocket, X } from "lucide-react";
import { useApp } from "@/components/providers/providers";
import { guideStepKeys } from "@/lib/plan";
import { isUiDismissed, useStore } from "@/lib/store";
import { useAuth } from "@/components/providers/session-provider";
import { NEAR_EXPIRY_DAYS, trialEndsIn } from "@/lib/trial-copy";

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

/**
 * Near-expiry notice for a STILL-VALID trial (3 or fewer days left).
 *
 * Deliberately restrained: it states the fact and gives one real way to act on
 * it. It appears only near the end, is dismissible, and reduces no
 * functionality — an expiring trial keeps the full Standard product until it
 * actually expires, at which point /trial-expired takes over.
 *
 * The support address comes from `supportEmail` prop (resolved on the server by
 * the app shell) rather than being read here: this is a client component, and
 * `process.env` is not available to it at runtime.
 */
export function TrialBanner({ supportEmail }: { supportEmail: string }) {
  const { effectiveCommercialAccess, trialDaysRemaining } = useAuth();
  const uiDismissals = useStore((s) => s.uiDismissals);
  const dismissUi = useStore((s) => s.dismissUi);
  const hydrated = useStore((s) => s._hasHydrated);
  if (
    !hydrated ||
    effectiveCommercialAccess !== "trial" ||
    trialDaysRemaining > NEAR_EXPIRY_DAYS ||
    isUiDismissed(uiDismissals.trialBanner)
  ) return null;

  return (
    <div className="flex flex-wrap items-start gap-3 bg-amber-500 px-4 py-3 text-sm text-white sm:items-center">
      <Rocket className="mt-0.5 size-4 shrink-0 sm:mt-0" />
      <p className="flex-1 leading-snug">
        {trialEndsIn(trialDaysRemaining)} Për të vazhduar më pas, na kontaktoni te{" "}
        <a
          href={`mailto:${supportEmail}`}
          className="font-semibold underline underline-offset-2"
        >
          {supportEmail}
        </a>
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
