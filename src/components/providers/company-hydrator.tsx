"use client";

// Pushes the server-fetched company (organization) profile of the active org into
// the store's read-only mirror. This is what lets the surfaces that only REFERENCE
// the company profile — the settings form, the invoice/print issuer fallback, the
// configurator/new-project/manual-invoice VAT & margin defaults — keep reading
// `useStore(s => s.company)` unchanged while the source of truth is Postgres
// (organization_profiles) + Better Auth (organization.name).
//
// Renders nothing. The mirror is refreshed whenever the server re-renders the
// layout (e.g. after a settings mutation calls router.refresh()).

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { CompanyProfile } from "@/domain/types";

export function CompanyHydrator({ company }: { company: CompanyProfile }) {
  const setCompany = useStore((s) => s.setCompany);
  useEffect(() => {
    setCompany(company);
  }, [company, setCompany]);
  return null;
}
