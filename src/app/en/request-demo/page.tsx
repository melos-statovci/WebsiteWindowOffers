import type { Metadata } from "next";
import { RequestDemoForm } from "@/components/public/request-demo-form";
import { RequestPageShell } from "@/components/public/request-page-shell";

export const metadata: Metadata = {
  title: "Request a demo | Kornizo",
  description:
    "Request a demonstration of Kornizo. We will contact you to arrange it. No account is created.",
  alternates: { languages: { sq: "/request-demo", en: "/en/request-demo" } },
  // Indexable: this is a real acquisition page, not a legal draft.
  robots: { index: true, follow: true },
};

export default function EnglishRequestDemoPage() {
  return (
    <RequestPageShell locale="en" logoHref="/en" signInLabel="Sign in">
      <section className="grid min-w-0 gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
        <div className="min-w-0">
          <p className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
            Product demo
          </p>
          <h1 className="mt-6 max-w-2xl text-wrap break-words font-heading text-3xl leading-tight font-bold text-slate-950 sm:text-5xl">
            Request a Kornizo demo
          </h1>
          {/* Deliberately NOT "Book a demo": no calendar or scheduling system
              exists, so nothing is booked here. No response time and no meeting
              length are promised, because neither has been decided. */}
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
            Want to see how Kornizo works for your company? Send the request and
            we will contact you to arrange the demonstration.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
            A demo request does not create an account and does not start the
            14-day trial. If you would rather try Kornizo yourself,{" "}
            <a href="/en/request-trial" className="font-semibold text-slate-500 underline hover:text-slate-900">
              request the free trial
            </a>
            . For general questions,{" "}
            <a href="/en/contact" className="font-semibold text-slate-500 underline hover:text-slate-900">
              contact us
            </a>
            .
          </p>
        </div>
        <RequestDemoForm locale="en" />
      </section>
    </RequestPageShell>
  );
}
