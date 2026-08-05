"use client";

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
          kryesore.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Provo sërish
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/50"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
