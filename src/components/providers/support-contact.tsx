"use client";

// Makes the Kornizo support contact available to client components inside the
// tenant shell.
//
// Resolved on the SERVER (the tenant layout) and threaded through React context:
// client components cannot read process.env at runtime, and a NEXT_PUBLIC_
// variable would be frozen into the bundle at build time.
//
// `email` is NULLABLE by design. Since Milestone 5.5 there is no default
// address — the vendor's own mailbox was removed and Kornizo's domain is not
// chosen yet — so a consumer must decide whether to render an address at all.
// `href` always works: mailto: when configured, /contact otherwise.

import { createContext, useContext } from "react";

export interface SupportContact {
  /** Configured address, or null when /contact is the channel. */
  email: string | null;
  /** Always-usable destination. */
  href: string;
}

const SupportContactContext = createContext<SupportContact | null>(null);

export function SupportContactProvider({
  contact,
  children,
}: {
  contact: SupportContact;
  children: React.ReactNode;
}) {
  return <SupportContactContext.Provider value={contact}>{children}</SupportContactContext.Provider>;
}

/**
 * The support contact to show the customer.
 *
 * Throws when used outside the provider rather than inventing a fallback: a
 * hard-coded address here is exactly what this module exists to prevent.
 */
export function useSupportContact(): SupportContact {
  const contact = useContext(SupportContactContext);
  if (!contact) throw new Error("useSupportContact must be used inside <SupportContactProvider>");
  return contact;
}
