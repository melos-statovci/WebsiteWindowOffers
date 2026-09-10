"use client";

// Makes the configured Kornizo support address available to client components
// inside the tenant shell.
//
// The value is resolved on the SERVER (the tenant layout calls supportEmail())
// and handed to the shell, which provides it here. Client components cannot
// read process.env at runtime, and a NEXT_PUBLIC_ variable would be frozen into
// the bundle at build time and duplicate the default — so it is threaded
// through React context instead, resolved fresh on every server render.

import { createContext, useContext } from "react";

const SupportContactContext = createContext<string | null>(null);

export function SupportContactProvider({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return <SupportContactContext.Provider value={email}>{children}</SupportContactContext.Provider>;
}

/**
 * The support address to show the customer.
 *
 * Throws when used outside the provider rather than falling back to a literal:
 * a silent hard-coded default here is exactly the duplication this module
 * exists to remove.
 */
export function useSupportEmail(): string {
  const email = useContext(SupportContactContext);
  if (!email) throw new Error("useSupportEmail must be used inside <SupportContactProvider>");
  return email;
}
