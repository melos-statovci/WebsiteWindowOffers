"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, Pencil, Trash2, Users } from "lucide-react";
import { PageHeader, Button, Card, Badge, Avatar, EmptyState } from "@/components/ui/kit";
import { ClientFormModal, type ClientDraft } from "@/components/clients/client-form-modal";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/format";
import { useApp } from "@/components/providers/providers";
import type { Client, ClientType } from "@/types";

type Filter = "Të gjithë" | ClientType;
type Sort = "Emri (A-Z)" | "Emri (Z-A)" | "Më të rejat";

export default function ClientsPage() {
  const router = useRouter();
  const { toast, confirm } = useApp();
  const clients = useStore((s) => s.clients);
  const addClient = useStore((s) => s.addClient);
  const updateClient = useStore((s) => s.updateClient);
  const deleteClient = useStore((s) => s.deleteClient);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("Të gjithë");
  const [sort, setSort] = useState<Sort>("Emri (A-Z)");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = clients.filter((c) => {
      if (filter !== "Të gjithë" && c.type !== filter) return false;
      if (!query) return true;
      return (
        c.name.toLowerCase().includes(query) ||
        (c.email ?? "").toLowerCase().includes(query) ||
        (c.phone ?? "").toLowerCase().includes(query) ||
        (c.nui ?? "").toLowerCase().includes(query)
      );
    });
    const sorted = [...list];
    if (sort === "Emri (A-Z)") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "Emri (Z-A)") sorted.sort((a, b) => b.name.localeCompare(a.name));
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [clients, q, filter, sort]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    setModalOpen(true);
  };

  const submit = (draft: ClientDraft) => {
    const patch = {
      name: draft.name,
      type: draft.type,
      phone: draft.phone || undefined,
      email: draft.email || undefined,
      address: draft.address || undefined,
      city: draft.city || undefined,
      nui: draft.nui || undefined,
    };
    if (editing) {
      updateClient(editing.id, patch);
      toast("Klienti u përditësua.");
    } else {
      addClient(patch);
      toast("Klienti u shtua.");
    }
    setModalOpen(false);
  };

  const remove = async (c: Client) => {
    const ok = await confirm({
      title: "Fshi klientin?",
      message: `“${c.name}” dhe të gjitha projektet, faturat e pagesat e lidhura do të fshihen lokalisht. Ky veprim nuk kthehet.`,
      confirmLabel: "Fshi",
      danger: true,
    });
    if (ok) {
      deleteClient(c.id);
      toast("Klienti u fshi.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Klientët"
        subtitle={`${rows.length} klientë · kliko një rresht për të hapur kartelën`}
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Shto Klient
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3">
          <Search className="size-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kërko klient: emri, telefoni, email, NUI..."
            className="h-full flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none"
        >
          <option>Të gjithë</option>
          <option>Privat</option>
          <option>Biznes</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none"
        >
          <option>Emri (A-Z)</option>
          <option>Emri (Z-A)</option>
          <option>Më të rejat</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Asnjë klient"
            description={q ? "Provoni një kërkim tjetër." : "Shtoni klientin tuaj të parë."}
            action={
              !q ? (
                <Button onClick={openAdd}>
                  <Plus className="size-4" /> Shto Klient
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-5 py-3">Klienti</th>
                  <th className="px-5 py-3">Lloji</th>
                  <th className="px-5 py-3">Kontakti</th>
                  <th className="px-5 py-3">Adresa</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="cursor-pointer border-b border-slate-200 last:border-0 transition-colors hover:bg-slate-200/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initial={initials(c.name)} className="size-9 rounded-lg text-sm" />
                        <span className="font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={c.type === "Biznes" ? "indigo" : "neutral"}>{c.type}</Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{c.phone ?? "—"}</td>
                    <td className="px-5 py-4 text-slate-500">{c.address ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => router.push(`/clients/${c.id}`)}>
                          Hap kartelën <ChevronRight className="size-3.5" />
                        </Button>
                        <button
                          onClick={() => openEdit(c)}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-900"
                          aria-label="Ndrysho"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(c)}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                          aria-label="Fshi"
                        >
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

      <ClientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submit}
        initial={editing}
      />
    </div>
  );
}
