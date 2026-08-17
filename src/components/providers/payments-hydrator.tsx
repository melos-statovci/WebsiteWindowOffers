"use client";

// Pushes the server-fetched payments of the active organization into the store's
// read-only mirror. Lets every payment consumer (invoice detail, client detail,
// dashboard finance selectors) keep reading `useStore(s => s.payments)` unchanged
// while Postgres is the source of truth.
//
// Renders nothing. Refreshed on every layout render (router.refresh() after a
// mutation, or an org switch).

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Payment } from "@/domain/types";

export function PaymentsHydrator({ payments }: { payments: Payment[] }) {
  const setPayments = useStore((s) => s.setPayments);
  useEffect(() => {
    setPayments(payments);
  }, [payments, setPayments]);
  return null;
}
