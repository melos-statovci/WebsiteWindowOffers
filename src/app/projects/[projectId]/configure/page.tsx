"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Undo2, Printer, Plus, ArrowLeft, MoreVertical, Copy, Pencil, Trash2, FileDown, Check,
} from "lucide-react";
import { Button, Avatar, Toggle, EmptyState, Badge } from "@/components/ui/kit";
import { ProductModal } from "@/components/projects/product-modal";
import { useStore } from "@/lib/store";
import { eur, initials } from "@/lib/format";
import { projectNet } from "@/lib/selectors";
import { printOffer } from "@/lib/print";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";
import type { OfferItem, OfferStatus } from "@/types";

type Step = "detajet" | "produkti" | "permbledhje";
const OPTIONS = ["Marzha", "Zbritje", "TVSH", "Montimi", "Demontimi", "Transporti"];

function WindowGlyph({ item }: { item: OfferItem }) {
  const wide = item.widthMm >= item.heightMm;
  return (
    <svg viewBox="0 0 40 48" className="size-full text-slate-400">
      <rect x="3" y="3" width="34" height="42" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="6" width="28" height="36" fill="currentColor" opacity="0.12" />
      {wide ? <line x1="20" y1="6" x2="20" y2="42" stroke="currentColor" strokeWidth="1" /> : <line x1="6" y1="24" x2="34" y2="24" stroke="currentColor" strokeWidth="1" />}
      <line x1="31" y1="10" x2="31" y2="20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function ConfigurePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const { toast, confirm } = useApp();

  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const company = useStore((s) => s.company);
  const updateProject = useStore((s) => s.updateProject);
  const setStatus = useStore((s) => s.setProjectStatus);
  const addItem = useStore((s) => s.addProjectItem);
  const updateItem = useStore((s) => s.updateProjectItem);
  const removeItem = useStore((s) => s.removeProjectItem);
  const duplicateItem = useStore((s) => s.duplicateProjectItem);
  const setOption = useStore((s) => s.setProjectOption);

  const [step, setStep] = useState<Step>("produkti");
  const [productOpen, setProductOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferItem | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100">
          <EmptyState icon={X} title="Projekti nuk u gjet" description={`Nuk ekziston asnjë projekt me ID “${projectId}”.`}
            action={<Button onClick={() => router.push("/projects")}>Kthehu te Projektet</Button>} />
        </div>
      </div>
    );
  }

  const net = projectNet(project);
  const vat = net * project.vatRate;

  const openAdd = () => { setEditingItem(null); setProductOpen(true); };
  const openEdit = (it: OfferItem) => { setEditingItem(it); setProductOpen(true); setMenuId(null); };
  const submitProduct = (data: Omit<OfferItem, "id">) => {
    if (editingItem) { updateItem(project.id, editingItem.id, data); toast("Produkti u përditësua."); }
    else { addItem(project.id, data); toast("Produkti u shtua."); }
    setProductOpen(false);
  };
  const removeProduct = async (it: OfferItem) => {
    setMenuId(null);
    const ok = await confirm({ title: "Hiq produktin?", message: `“${it.label}” do të hiqet nga oferta.`, confirmLabel: "Hiq", danger: true });
    if (ok) { removeItem(project.id, it.id); toast("Produkti u hoq."); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1">
          <button onClick={() => router.push("/projects")} className="grid size-8 place-items-center rounded-lg text-slate-700 hover:bg-slate-300" aria-label="Mbyll"><X className="size-4" /></button>
          <button className="grid size-8 place-items-center rounded-lg text-slate-400" aria-label="Kthe pas" disabled><Undo2 className="size-4" /></button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-200/60 p-1">
          {([["detajet", "Detajet"], ["produkti", "Produkti"], ["permbledhje", "Përmbledhje"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setStep(v)}
              className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", step === v ? "bg-slate-50 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700")}>{label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step === "produkti" ? (
            <button onClick={openAdd} className="grid size-9 place-items-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500" aria-label="Shto produkt"><Plus className="size-5" /></button>
          ) : (
            <button onClick={() => printOffer(project, company)} className="grid size-9 place-items-center rounded-full bg-slate-200/70 text-slate-700 hover:bg-slate-300" aria-label="Printo ofertën"><Printer className="size-5" /></button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-16">
        {step === "detajet" && (
          <div className="space-y-4">
            <button onClick={() => setStep("produkti")} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
              <ArrowLeft className="size-4" /> Kthehu te Oferta ({project.items.length})
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Klienti</div>
              <div className="mt-2 flex items-center gap-3">
                <Avatar initial={initials(project.clientName)} className="size-10 rounded-lg text-sm" />
                <span className="font-semibold text-slate-900">{project.clientName}</span>
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Profili</div>
              <label className="block">
                <span className="text-sm text-slate-400">Sistemi i profilit</span>
                <input value={project.profileSystem} onChange={(e) => updateProject(project.id, { profileSystem: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-400">Ngjyra e profilit</span>
                <input value={project.profileColor} onChange={(e) => updateProject(project.id, { profileColor: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-400">Statusi i ofertës</span>
                <select value={project.status} onChange={(e) => setStatus(project.id, e.target.value as OfferStatus)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500">
                  {(["Draft", "Dërguar", "Pranuar", "Refuzuar"] as OfferStatus[]).map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <Button className="w-full" onClick={() => setStep("produkti")}>Vazhdo Konfigurimin</Button>
          </div>
        )}

        {step === "produkti" && (
          project.items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-100">
              <EmptyState icon={Plus} title="Asnjë produkt ende" description="Shtoni produktin e parë në ofertë."
                action={<Button onClick={openAdd}><Plus className="size-4" /> Shto produkt</Button>} />
            </div>
          ) : (
            <ul className="space-y-3">
              {project.items.map((item) => (
                <li key={item.id} className="relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-3">
                  <button onClick={() => openEdit(item)} className="grid size-16 shrink-0 place-items-center rounded-xl bg-slate-50 p-2" aria-label="Edito"><WindowGlyph item={item} /></button>
                  <button onClick={() => openEdit(item)} className="flex-1 text-left">
                    <div className="font-semibold text-slate-900">{item.label}</div>
                    <div className="text-sm text-slate-400">{item.widthMm} × {item.heightMm} mm · {item.qty} copë</div>
                    <div className="font-heading font-semibold text-slate-900">{eur(item.qty * item.unitPrice)}</div>
                  </button>
                  <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60" aria-label="Opsione"><MoreVertical className="size-5" /></button>
                  {menuId === item.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                      <div className="absolute top-12 right-3 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 py-1 shadow-xl">
                        <MenuItem icon={Pencil} label="Edito" onClick={() => openEdit(item)} />
                        <MenuItem icon={Copy} label="Dyfisho" onClick={() => { duplicateItem(project.id, item.id); setMenuId(null); toast("Produkti u dyfishua."); }} />
                        <MenuItem icon={Trash2} label="Hiq" danger onClick={() => removeProduct(item)} />
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )
        )}

        {step === "permbledhje" && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <div className="font-heading text-lg font-bold text-slate-900">Përmbledhja e Ofertës</div>
                  <div className="text-sm text-slate-400">{project.items.length} pozicione · {project.clientName}</div>
                </div>
                <Badge tone={project.status === "Pranuar" ? "emerald" : project.status === "Refuzuar" ? "rose" : "blue"}>{project.status}</Badge>
              </div>
              <div className="divide-y divide-slate-200 text-sm">
                <Row label="Totali" value={eur(net)} muted />
                <Row label={`TVSH (${Math.round(project.vatRate * 100)}%)`} value={`+${eur(vat)}`} muted />
              </div>
              <div className="flex items-center justify-between bg-slate-50 px-5 py-4">
                <span className="font-heading font-semibold text-slate-900">Totali përfundimtar</span>
                <span className="font-heading text-xl font-bold text-slate-900">{eur(net + vat)}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 px-1 text-xs font-bold tracking-widest text-slate-400 uppercase">Opsionet</div>
              <div className="space-y-2">
                {OPTIONS.map((o) => (
                  <div key={o} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4">
                    <span className="font-semibold text-slate-900">{o}</span>
                    <Toggle checked={!!project.options?.[o]} onChange={(v) => setOption(project.id, o, v)} label={o} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={() => printOffer(project, company)}><FileDown className="size-4" /> Oferta finale (PDF)</Button>
              <Button variant="outline" onClick={() => printOffer(project, company)}><Printer className="size-4" /> Shiko ofertën</Button>
              {project.status !== "Pranuar" ? (
                <Button onClick={() => { setStatus(project.id, "Pranuar"); toast("Oferta u shënua e pranuar."); }}><Check className="size-4" /> Shëno e pranuar</Button>
              ) : (
                <Button variant="subtle" disabled><Check className="size-4" /> E pranuar</Button>
              )}
            </div>
          </div>
        )}
      </div>

      <ProductModal open={productOpen} onClose={() => setProductOpen(false)} onSubmit={submitProduct} initial={editingItem} />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-slate-200/60", danger ? "text-rose-400" : "text-slate-700")}>
      <Icon className="size-4" /> {label}
    </button>
  );
}
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className={muted ? "text-slate-400" : "text-slate-700"}>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
