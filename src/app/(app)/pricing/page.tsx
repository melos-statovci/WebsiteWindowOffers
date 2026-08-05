import { Suspense } from "react";
import { PricingClient } from "@/components/pricing/pricing-client";

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Duke ngarkuar...</div>}>
      <PricingClient />
    </Suspense>
  );
}
