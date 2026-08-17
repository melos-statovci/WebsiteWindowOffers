"use client";

// Pushes the server-fetched invoices of the active organization into the store's
// read-only mirror. Lets every invoice consumer (list, detail, dashboard, client
// detail, global search, print) keep reading `useStore(s => s.invoices)` unchanged
// while Postgres is the source of truth.
//
// Renders nothing. The mirror is refreshed whenever the server re-renders the
// layout (e.g. after a mutation calls router.refresh()), so an org switch or any
// invoice/payment change replaces it.

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Invoice } from "@/domain/types";

export function InvoicesHydrator({ invoices }: { invoices: Invoice[] }) {
  const setInvoices = useStore((s) => s.setInvoices);
  useEffect(() => {
    setInvoices(invoices);
  }, [invoices, setInvoices]);
  return null;
}
