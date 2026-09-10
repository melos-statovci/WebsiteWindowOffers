"use client";

// Root error boundary. Like not-found.tsx this also catches PUBLIC routes, so
// the recovery actions must work for a logged-out visitor: "Dashboard" alone
// was a dead end, because the proxy redirects it to /sign-in without a session.
//
// The real error is logged to the server console only. Nothing about it reaches
// the page — no message, no stack, no Next.js `digest`.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Diçka shkoi keq</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ndodhi një gabim i papritur. Provoni sërish ose kthehuni te faqja
          kryesore. Të dhënat tuaja nuk janë prekur.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-800"
          >
            Provo sërish
          </button>
          <a
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/50"
          >
            Ballina
          </a>
        </div>
      </div>
    </div>
  );
}
