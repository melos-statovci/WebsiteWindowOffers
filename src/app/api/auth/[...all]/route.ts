// Better Auth's catch-all route handler (sign-in/up/out, session, organization,
// invitations). This is the ONLY server route Better Auth needs.

import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
