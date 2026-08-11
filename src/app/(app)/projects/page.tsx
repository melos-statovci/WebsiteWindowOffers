"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, Search, FolderKanban, Trash2 } from "lucide-react";
import { PageHeader, Button, Card, Badge, EmptyState } from "@/components/ui/kit";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { useStore } from "@/lib/store";
import { eur, shortDate } from "@/lib/format";
import { projectTotal } from "@/domain/finance/selectors";
import { useApp } from "@/components/providers/providers";
import type { Project, OfferStatus } from "@/domain/types";

const statusTone: Record<OfferStatus, "neutral" | "blue" | "emerald" | "rose"> = {
  Draft: "neutral",
  Dërguar: "blue",
  Pranuar: "emerald",
  Refuzuar: "rose",
};

export default function ProjectsPage() {
  const router = useRouter();
  const { toast, confirm } = useApp();
  const projects = useStore((s) => s.projects);
  const archiveProject = useStore((s) => s.archiveProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [status, setStatus] = useState<OfferStatus | "Të gjitha">("Të gjitha");
  const [modalOpen, setModalOpen] = useState(false);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (p.archived !== showArchived) return false;
      if (status !== "Të gjitha" && p.status !== status) return false;
      if (!query) return true;
      return (
        p.number.toLowerCase().includes(query) ||
        p.title.toLowerCase().includes(query) ||
        p.clientName.toLowerCase().includes(query)
      );
    });
  }, [projects, q, showArchived, status]);

  const toggleArchive = async (p: Project) => {
    archiveProject(p.id, !p.archived);
    toast(p.archived ? "Projekti u kthye nga arkivi." : "Projekti u arkivua.");
  };

  const remove = async (p: Project) => {
    const ok = await confirm({
      title: "Fshi projektin?",
      message: `“${p.number} · ${p.title}” do të fshihet lokalisht. Ky veprim nuk kthehet.`,
      confirmLabel: "Fshi",
      danger: true,
    });
    if (ok) {
      deleteProject(p.id);
      toast("Projekti u fshi.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Projektet"
        subtitle={`${rows.length} projekte`}
        actions={
          <>
            <Button variant={showArchived ? "primary" : "outline"} onClick={() => setShowArchived((v) => !v)}>
              <Archive className="size-4" /> Arkivi
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="size-4" /> Projekt i ri
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3">
          <Search className="size-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kërko numër, titull ose klient..."
            className="h-full flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as OfferStatus | "Të gjitha")}
          className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none">
          <option>Të gjitha</option>
          <option>Draft</option>
          <option>Dërguar</option>
          <option>Pranuar</option>
          <option>Refuzuar</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={showArchived ? "Asnjë projekt i arkivuar" : "Asnjë projekt"}
            description={showArchived ? "Projektet e arkivuara do të shfaqen këtu." : "Krijoni projektin tuaj të parë."}
            action={!showArchived ? <Button onClick={() => setModalOpen(true)}><Plus className="size-4" /> Projekt i ri</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-5 py-3">Numri</th>
                  <th className="px-5 py-3">Projekti</th>
                  <th className="px-5 py-3">Klienti</th>
                  <th className="px-5 py-3">Statusi</th>
                  <th className="px-5 py-3">Krijuar</th>
                  <th className="px-5 py-3 text-right">Shuma totale</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} onClick={() => router.push(`/projects/${p.id}/configure`)}
                    className="cursor-pointer border-b border-slate-200 last:border-0 transition-colors hover:bg-slate-200/40">
                    <td className="px-5 py-4 font-semibold text-slate-900">{p.number}</td>
                    <td className="px-5 py-4 text-slate-500">{p.title}</td>
                    <td className="px-5 py-4 text-slate-500">{p.clientName}</td>
                    <td className="px-5 py-4"><Badge tone={statusTone[p.status]}>{p.status}</Badge></td>
                    <td className="px-5 py-4 text-slate-500">{shortDate(p.createdAt)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-900">{eur(projectTotal(p))}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleArchive(p)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-900" aria-label={p.archived ? "Kthe nga arkivi" : "Arkivo"}>
                          <Archive className="size-4" />
                        </button>
                        <button onClick={() => remove(p)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Fshi">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
