"use client";

// Pushes the server-fetched active PricingCatalog of the active organization into
// the store's NON-persisted runtime mirror. This is what lets the configurator
// read pricing synchronously (useStore(s => s.pricing)) for live preview while
// Postgres remains the authoritative source.
//
// Renders nothing. The mirror is refreshed whenever the server re-renders the
// layout — after a pricing save (router.refresh) and, crucially, after an
// ORGANIZATION SWITCH, so the previous org's pricing is fully replaced (setPricing
// overwrites wholesale) and never used as another org's authoritative pricing.

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { PricingCatalog } from "@/domain/pricing/types";

export function PricingHydrator({ pricing }: { pricing: PricingCatalog }) {
  const setPricing = useStore((s) => s.setPricing);
  useEffect(() => {
    setPricing(pricing);
  }, [pricing, setPricing]);
  return null;
}
