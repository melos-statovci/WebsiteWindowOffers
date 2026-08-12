"use client";

// Browser-side Better Auth client. Same-origin, so baseURL is inferred. Used by
// the sign-in/up pages, sign-out button, and the organization switcher.

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
