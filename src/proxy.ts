import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Next 16 "proxy" (formerly "middleware"). Optimistic edge gate: redirect based
// on session-cookie PRESENCE only (no DB). Authoritative session validation
// happens server-side in the protected layouts (requireAuthContext). This just
// stops unauthenticated users from ever loading a protected page — including by
// typing the URL directly.

const AUTH_PAGES = ["/sign-in", "/sign-up"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate top-level page NAVIGATIONS (GET). Never touch Server Action POSTs
  // or other non-GET requests — redirecting a server-action response corrupts it
  // (Next error E394). Server actions do their own auth checks.
  if (req.method !== "GET") return NextResponse.next();

  const hasSession = Boolean(getSessionCookie(req));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Security-critical redirect only: no session cookie -> can't load a protected
  // page. The inverse ("already signed in, skip the auth page") is handled in the
  // auth pages with a REAL server session check — doing it here on cookie
  // presence alone would loop against a stale/invalid cookie.
  if (!hasSession && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Better Auth's own routes, Next internals, and static files.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
