// Root 404. This boundary catches PUBLIC routes too (/, /privacy, /request-trial),
// so it must not assume a signed-in visitor: it previously offered only
// "back to Dashboard", which the proxy bounces to /sign-in for anyone logged
// out — a dead end on the public site. The homepage works for everyone, so it
// is the primary action, with Dashboard offered as a secondary link that is
// useful to a signed-in member and harmless otherwise.

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center">
        <div className="font-heading text-5xl font-bold text-slate-900">404</div>
        <h1 className="mt-3 font-heading text-2xl font-bold text-slate-900">
          Faqja nuk u gjet
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Faqja që kërkoni nuk ekziston ose është zhvendosur.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-800"
          >
            Ballina
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/50"
          >
            Aplikacioni
          </Link>
        </div>
      </div>
    </div>
  );
}
