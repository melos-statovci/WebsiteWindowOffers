"use server";

// Public "use server" entry point for saving pricing — the client-callable
// Next.js server action. It accepts only the validated input shape; request
// headers (and therefore the session / active organization) are read
// server-side and can never be supplied by the caller. Mirrors client.action.ts.

import { headers } from "next/headers";
import { savePricingAction, type SavePricingInput } from "@/server/actions/pricing";

export async function savePricing(input: SavePricingInput) {
  return savePricingAction(input, await headers());
}
