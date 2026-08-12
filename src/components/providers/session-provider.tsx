"use client";

// Client-side holder for the server-resolved auth context (identity, active org,
// role, memberships) plus the sign-out and org-switch actions the shell needs.
// The value is populated server-side by the protected layouts.

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { switchOrganization } from "@/auth/actions";
import type { AuthContext } from "@/auth/types";

const Ctx = createContext<AuthContext | null>(null);

export function SessionProvider({ value, children }: { value: AuthContext; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within SessionProvider");
  return v;
}

export function useAuthActions() {
  const router = useRouter();

  const signOut = async () => {
    // Only the auth session is cleared. Business localStorage is intentionally
    // preserved during Phase 2 (it is still browser-local).
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  const switchOrg = async (organizationId: string) => {
    const res = await switchOrganization(organizationId);
    if (res.ok) router.refresh();
    return res;
  };

  return { signOut, switchOrg };
}
