import type { Metadata } from "next";
import { RequestDemoForm } from "@/components/public/request-demo-form";
import { RequestPageShell } from "@/components/public/request-page-shell";

export const metadata: Metadata = {
  title: "Kërko një demo | Kornizo",
  description:
    "Kërkoni një demonstrim të Kornizo. Do t'ju kontaktojmë për ta organizuar. Nuk krijohet llogari.",
  alternates: { languages: { sq: "/request-demo", en: "/en/request-demo" } },
  // Indexable: this is a real acquisition page, not a legal draft.
  robots: { index: true, follow: true },
};

export default function RequestDemoPage() {
  return (
    <RequestPageShell locale="sq" logoHref="/" signInLabel="Hyr">
      <section className="grid min-w-0 gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
        <div className="min-w-0">
          <p className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
            Demo e produktit
          </p>
          <h1 className="mt-6 max-w-2xl text-wrap break-words font-heading text-3xl leading-tight font-bold text-slate-950 sm:text-5xl">
            Kërko një demo të Kornizo
          </h1>
          {/* Says exactly what happens next and nothing more. Deliberately NOT
              "Rezervo një demo" / "Book a demo": there is no calendar or
              scheduling system, so the visitor picks no slot here. No response
              time and no meeting length are promised, because neither has been
              decided. */}
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
            Dëshironi të shihni se si funksionon Kornizo për kompaninë tuaj?
            Dërgoni kërkesën dhe do t&apos;ju kontaktojmë për të organizuar
            demonstrimin.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
            Kërkesa për demo nuk krijon llogari dhe nuk nis provën 14-ditore. Nëse
            dëshironi ta provoni vetë Kornizo,{" "}
            <a href="/request-trial" className="font-semibold text-slate-500 underline hover:text-slate-900">
              kërkoni provën falas
            </a>
            . Për pyetje të përgjithshme,{" "}
            <a href="/contact" className="font-semibold text-slate-500 underline hover:text-slate-900">
              na kontaktoni
            </a>
            .
          </p>
        </div>
        <RequestDemoForm locale="sq" />
      </section>
    </RequestPageShell>
  );
}
