"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FolderKanban,
  Users,
  ReceiptText,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "@/components/providers/providers";
import { navGroups } from "@/lib/nav";
import { projects, clients, invoices } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

interface Result {
  label: string;
  sub: string;
  href: string;
  icon: LucideIcon;
}

export function SearchPalette() {
  const { overlay, setOverlay } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = overlay === "search";

  // Reset query + focus the field each time the palette opens.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const pages: Result[] = navGroups.flatMap((g) =>
      g.items.map((i) => ({
        label: i.label,
        sub: "Faqe",
        href: i.href,
        icon: i.icon,
      })),
    );
    const projectResults: Result[] = projects.map((p) => ({
      label: `${p.number} · ${p.title}`,
      sub: "Projekt",
      href: `/projects/${p.id}/configure`,
      icon: FolderKanban,
    }));
    const clientResults: Result[] = clients.map((c) => ({
      label: c.name,
      sub: "Klient",
      href: `/clients/${c.id}`,
      icon: Users,
    }));
    const invoiceResults: Result[] = invoices.map((inv) => ({
      label: `${inv.number} · ${inv.clientName}`,
      sub: "Faturë",
      href: `/invoices/${inv.id}`,
      icon: ReceiptText,
    }));

    const all = [
      ...pages,
      ...projectResults,
      ...clientResults,
      ...invoiceResults,
    ];
    const query = q.trim().toLowerCase();
    if (!query) return all.slice(0, 8);
    return all
      .filter(
        (r) =>
          r.label.toLowerCase().includes(query) ||
          r.sub.toLowerCase().includes(query),
      )
      .slice(0, 12);
  }, [q]);

  if (!open) return null;

  const go = (href: string) => {
    setOverlay(null);
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={() => setOverlay(null)}
      />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            go(results[active].href);
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="size-5 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Kërko faqe, projekte, klientë, fatura…"
            className="h-14 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <kbd className="rounded border border-slate-200 bg-slate-200/60 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            ESC
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-400">
              Asnjë rezultat për “{q}”.
            </li>
          )}
          {results.map((r, i) => {
            const Icon = r.icon;
            return (
              <li key={r.href + r.label}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                    active === i ? "bg-slate-200/60" : "hover:bg-slate-200/40",
                  )}
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-200 text-slate-500">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {r.label}
                    </span>
                    <span className="block text-xs text-slate-400">{r.sub}</span>
                  </span>
                  <ArrowRight className="size-4 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
