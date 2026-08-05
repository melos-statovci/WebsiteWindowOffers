import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center">
        <div className="font-heading text-5xl font-bold text-indigo-400">404</div>
        <h1 className="mt-3 font-heading text-2xl font-bold text-slate-900">
          Faqja nuk u gjet
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Faqja që kërkoni nuk ekziston ose është zhvendosur.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Kthehu te Dashboard
        </Link>
      </div>
    </div>
  );
}
