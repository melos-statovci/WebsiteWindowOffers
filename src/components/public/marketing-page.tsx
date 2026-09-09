import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  LogIn,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import type { PublicMarketingContent } from "@/lib/public-marketing";
import { cn } from "@/lib/utils";

export function MarketingPage({ content }: { content: PublicMarketingContent }) {
  return (
    <main lang={content.locale} className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-700">
      <PublicHeader content={content} />
      <HeroSection content={content} />
      <ProductSection content={content} />
      <WorkflowSection content={content} />
      <FeaturesSection content={content} />
      <StandardSection content={content} />
      <TrustSection content={content} />
      <FaqSection content={content} />
      <FinalCtaSection content={content} />
      <PublicFooter content={content} />
    </main>
  );
}

function PublicHeader({ content }: { content: PublicMarketingContent }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <LogoLink href={content.basePath} ariaLabel={content.actions.homepageAria} />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {content.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 outline-none transition-colors hover:bg-slate-200/60 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-neutral-500/60"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LanguageSwitcher locale={content.locale} />
          <HeaderLink href="/sign-in" variant="ghost">
            <LogIn className="size-4" />
            {content.actions.signIn}
          </HeaderLink>
          <HeaderLink href={`${content.basePath === "/" ? "" : content.basePath}/request-trial`} variant="primary">
            {content.actions.requestTrial}
          </HeaderLink>
        </div>
        <details className="group relative ml-auto md:hidden">
          <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 outline-none transition-colors hover:bg-slate-200/60 focus-visible:ring-2 focus-visible:ring-neutral-500/60 [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" />
            <span className="sr-only">{content.actions.openNavigation}</span>
          </summary>
          <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-slate-100 p-2 shadow-2xl">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {content.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-neutral-500/60"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2">
              <LanguageSwitcher locale={content.locale} className="w-fit" />
              <HeaderLink href="/sign-in" variant="outline">
                <LogIn className="size-4" />
                {content.actions.signIn}
              </HeaderLink>
              <HeaderLink href={`${content.basePath === "/" ? "" : content.basePath}/request-trial`} variant="primary">
                {content.actions.requestTrial}
              </HeaderLink>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function LogoLink({ href, ariaLabel }: { href: string; ariaLabel: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60"
      aria-label={ariaLabel}
    >
      <span className="grid size-9 place-items-center rounded-lg bg-slate-950 font-heading text-base font-bold text-slate-50">
        K
      </span>
      <span className="font-heading text-lg font-bold text-slate-950">
        Kornizo
      </span>
    </Link>
  );
}

function HeaderLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "primary" | "outline" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-500/60",
        variant === "primary" &&
          "public-primary-action shadow-sm shadow-slate-950/10",
        variant === "outline" &&
          "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-200/60",
        variant === "ghost" &&
          "text-slate-600 hover:bg-slate-200/60 hover:text-slate-950",
      )}
    >
      {children}
    </Link>
  );
}

function HeroSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section className="relative border-b border-slate-200 bg-slate-50" id="product">
      <div className="absolute inset-x-0 top-0 h-px bg-slate-300/60" />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-24">
        <div className="min-w-0">
          <p className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
            {content.hero.eyebrow}
          </p>
          <h1 className="mt-6 max-w-4xl text-wrap font-heading text-4xl font-bold leading-[1.05] text-slate-950 sm:text-6xl lg:text-7xl">
            {content.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            {content.hero.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <HeroLink href={`${content.basePath === "/" ? "" : content.basePath}/request-trial`} variant="primary">
              {content.actions.requestTrial}
              <ArrowRight className="size-4" />
            </HeroLink>
            <HeroLink href={`${content.basePath === "/" ? "" : content.basePath}/request-demo`} variant="outline">
              {content.actions.requestDemo}
            </HeroLink>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-500">
            {content.hero.bullets.map((bullet) => (
              <span key={bullet} className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-500" />
                {bullet}
              </span>
            ))}
          </div>
        </div>
        <ProductPreview content={content} />
      </div>
    </section>
  );
}

function HeroLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "primary" | "outline";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold uppercase tracking-[0.08em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-500/60",
        variant === "primary"
          ? "public-primary-action shadow-sm shadow-slate-950/10"
          : "border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200/70",
      )}
    >
      {children}
    </Link>
  );
}

function ProductPreview({ content }: { content: PublicMarketingContent }) {
  return (
    <div className="relative min-w-0 max-w-full lg:max-w-[610px] lg:justify-self-end">
      <div className="absolute -inset-4 rounded-[2rem] border border-slate-200 bg-slate-100/55" />
      <div className="relative max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl shadow-slate-950/10">
        <div className="flex h-12 items-center gap-2 border-b border-slate-200 px-4">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="ml-3 text-xs font-semibold text-slate-400">{content.productPreview.chromeLabel}</span>
        </div>
        <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden border-r border-slate-200 bg-slate-50/70 p-4 lg:block">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-slate-950 font-heading font-bold text-slate-50">
                K
              </span>
              <div>
                <div className="font-heading text-sm font-bold text-slate-950">Kornizo</div>
                <div className="text-xs font-semibold text-slate-400">{content.productPreview.standardTrial}</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {content.productPreview.sidebar.map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold",
                    index === 1 ? "bg-slate-200 text-slate-950" : "text-slate-500",
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="grid min-w-0 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-bold tracking-[0.16em] text-slate-400 uppercase">{content.productPreview.eyebrow}</div>
                    <div className="mt-1 font-heading text-xl font-bold text-slate-950">{content.productPreview.title}</div>
                  </div>
                  <span className="w-fit rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                    {content.productPreview.calculated}
                  </span>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mx-auto aspect-[3/4] max-w-[130px] rounded-md border-[6px] border-slate-600 bg-slate-100 p-1">
                      <div className="grid h-full grid-cols-2 gap-1">
                        <span className="border border-slate-400 bg-sky-50/70" />
                        <span className="border border-slate-400 bg-sky-50/70" />
                        <span className="col-span-2 border border-slate-400 bg-sky-50/70" />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {content.proofItems.slice(0, 4).map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-100 p-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-700">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold tracking-wide text-slate-400 uppercase">{item.label}</div>
                            <div className="text-sm font-semibold text-slate-900">{item.value}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {content.proofItems.slice(4).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <Icon className="mb-5 size-5 text-slate-700" />
                      <div className="text-xs font-bold tracking-wide text-slate-400 uppercase">{item.label}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section className="border-b border-slate-200 bg-slate-100 py-16 sm:py-20">
      <SectionInner>
        <SectionHeading
          eyebrow={content.productProof.eyebrow}
          title={content.productProof.title}
          description={content.productProof.description}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {content.trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-800">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-bold text-slate-900">{item.title}</span>
              </div>
            );
          })}
        </div>
      </SectionInner>
    </section>
  );
}

function WorkflowSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section id="workflow" className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
      <SectionInner>
        <SectionHeading
          eyebrow={content.workflow.eyebrow}
          title={content.workflow.title}
          description={content.workflow.description}
        />
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.workflow.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="rounded-xl border border-slate-200 bg-slate-100 p-5">
                <div className="mb-8 flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-lg bg-slate-200 text-slate-800">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-heading text-3xl font-bold text-slate-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </SectionInner>
    </section>
  );
}

function FeaturesSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section id="features" className="border-b border-slate-200 bg-slate-100 py-16 sm:py-20">
      <SectionInner>
        <SectionHeading
          eyebrow={content.features.eyebrow}
          title={content.features.title}
          description={content.features.description}
        />
        <div className="grid gap-4 lg:grid-cols-4">
          {content.features.groups.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <Icon className="size-6 text-slate-800" />
                <h3 className="mt-5 font-heading text-lg font-bold text-slate-950">{group.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{group.description}</p>
                <ul className="mt-5 space-y-2">
                  {group.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </SectionInner>
    </section>
  );
}

function StandardSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section id="standard" className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
      <SectionInner>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">{content.standard.eyebrow}</p>
            <h2 className="mt-4 font-heading text-4xl font-bold text-slate-950 sm:text-5xl">
              {content.standard.plan.name}
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-500">
              {content.standard.plan.summary}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <HeroLink href={`${content.basePath === "/" ? "" : content.basePath}/request-trial`} variant="primary">
                {content.actions.requestTrial}
                <ArrowRight className="size-4" />
              </HeroLink>
              <HeroLink href={`${content.basePath === "/" ? "" : content.basePath}/request-demo`} variant="outline">
                {content.actions.requestDemo}
              </HeroLink>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 sm:p-7">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-heading text-2xl font-bold text-slate-950">{content.standard.plan.name}</div>
                <div className="mt-1 text-sm font-semibold text-emerald-600">{content.standard.plan.trial}</div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
                <ShieldCheck className="size-4" />
                {content.standard.badge}
              </span>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {content.standard.plan.included.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              {content.standard.pricingNote}
            </div>
          </div>
        </div>
      </SectionInner>
    </section>
  );
}

function TrustSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section className="border-b border-slate-200 bg-slate-100 py-12">
      <SectionInner>
        <div className="grid gap-4 md:grid-cols-3">
          {content.trustMetrics.map((item) => (
            <TrustMetric key={item.title} icon={item.icon} title={item.title} text={item.text} />
          ))}
        </div>
      </SectionInner>
    </section>
  );
}

function TrustMetric({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-800">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="font-heading text-lg font-bold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function FaqSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section id="faq" className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
      <SectionInner>
        <SectionHeading
          eyebrow={content.faq.eyebrow}
          title={content.faq.title}
          description={content.faq.description}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {content.faq.items.map((item) => (
            <details key={item.question} className="group rounded-xl border border-slate-200 bg-slate-100 p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-bold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60 [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronRight className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-4 text-sm leading-6 text-slate-500">{item.answer}</p>
            </details>
          ))}
        </div>
      </SectionInner>
    </section>
  );
}

function FinalCtaSection({ content }: { content: PublicMarketingContent }) {
  return (
    <section className="bg-slate-100 py-16 sm:py-20">
      <SectionInner className="text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">{content.finalCta.eyebrow}</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-heading text-4xl font-bold text-slate-950 sm:text-5xl">
          {content.finalCta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-500">
          {content.finalCta.description}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <HeroLink href={`${content.basePath === "/" ? "" : content.basePath}/request-trial`} variant="primary">
            {content.actions.requestTrial}
            <ArrowRight className="size-4" />
          </HeroLink>
          <HeroLink href={`${content.basePath === "/" ? "" : content.basePath}/request-demo`} variant="outline">
            {content.actions.requestDemo}
          </HeroLink>
        </div>
      </SectionInner>
    </section>
  );
}

function PublicFooter({ content }: { content: PublicMarketingContent }) {
  return (
    <footer className="border-t border-neutral-800 bg-black text-neutral-300">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-white font-heading text-base font-bold text-slate-950">
              K
            </span>
            <span className="font-heading text-lg font-bold text-white">Kornizo</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            {content.footer.description}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold" aria-label="Footer navigation">
          <Link href="#product" className="hover:text-white">{content.footer.product}</Link>
          <Link href="/sign-in" className="hover:text-white">{content.actions.signIn}</Link>
          <Link href={`${content.basePath === "/" ? "" : content.basePath}/request-trial`} className="hover:text-white">{content.footer.trial}</Link>
          <Link href={`${content.basePath === "/" ? "" : content.basePath}/request-demo`} className="hover:text-white">{content.footer.demo}</Link>
        </nav>
      </div>
    </footer>
  );
}

function SectionInner({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-10 max-w-3xl">
      <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">{eyebrow}</p>
      <h2 className="mt-4 font-heading text-4xl font-bold text-slate-950 sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-500">{description}</p>
    </div>
  );
}
