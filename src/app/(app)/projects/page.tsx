"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, Search, FolderKanban } from "lucide-react";
import { PageHeader, Button, Card, EmptyState } from "@/components/ui/kit";
import { projects } from "@/lib/mock/data";
import { eur, shortDate } from "@/lib/format";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useApp();
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (p.archived !== showArchived) return false;
      if (!query) return true;
      return (
        p.number.toLowerCase().includes(query) ||
        p.title.toLowerCase().includes(query) ||
        p.clientName.toLowerCase().includes(query)
      );
    });
  }, [q, showArchived]);

  return (
    <div>
      <PageHeader
        title="Projektet"
        subtitle={`${rows.length} projekte`}
        actions={
          <>
            <Button
              variant={showArchived ? "primary" : "outline"}
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="size-4" /> Arkivi
            </Button>
            <Button onClick={() => toast("Projekt i ri — demo lokale.")}>
              <Plus className="size-4" /> Projekt i ri
            </Button>
          </>
        }
      />

      <div className="mb-4 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3">
        <Search className="size-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kërko numër, titull ose klient..."
          className="h-full flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
        />
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={showArchived ? "Asnjë projekt i arkivuar" : "Asnjë projekt"}
            description={
              showArchived
                ? "Projektet e arkivuara do të shfaqen këtu."
                : "Krijoni projektin tuaj të parë."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-5 py-3">Numri</th>
                  <th className="px-5 py-3">Projekti</th>
                  <th className="px-5 py-3">Klienti</th>
                  <th className="px-5 py-3">Krijuar</th>
                  <th className="px-5 py-3 text-right">Shuma totale</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}/configure`)}
                    className={cn(
                      "cursor-pointer border-b border-slate-200 last:border-0 transition-colors hover:bg-slate-200/40",
                    )}
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {p.number}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{p.title}</td>
                    <td className="px-5 py-4 text-slate-500">{p.clientName}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {shortDate(p.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {eur(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
