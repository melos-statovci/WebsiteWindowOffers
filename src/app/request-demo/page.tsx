import type { Metadata } from "next";
import { RequestDemoForm } from "@/components/public/request-demo-form";
import { RequestPageShell } from "@/components/public/request-page-shell";

export const metadata: Metadata = {
  title: "Kërko demo | Kornizo",
  description: "Dërgo një kërkesë demo për Kornizo pa krijuar llogari.",
  alternates: { languages: { sq: "/request-demo", en: "/en/request-demo" } },
};

export default function RequestDemoPage() {
  return (
    <RequestPageShell locale="sq" logoHref="/" signInLabel="Hyr">
      <section className="grid min-w-0 gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
        <div className="min-w-0">
          <p className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
            Demo e produktit
          </p>
          <h1 className="mt-6 max-w-2xl text-wrap break-words font-heading text-3xl font-bold leading-tight text-slate-950 sm:text-5xl">
            Shihni si Kornizo përshtatet me kompaninë tuaj
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
            Dërgoni një kërkesë të shkurtër dhe ekipi ynë do ta përdorë për ndjekje
            të brendshme. Kjo nuk krijon llogari apo provë falas.
          </p>
        </div>
        <RequestDemoForm locale="sq" />
      </section>
    </RequestPageShell>
  );
}
