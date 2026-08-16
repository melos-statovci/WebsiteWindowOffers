"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button, Field, Input, Label } from "@/components/ui/kit";
import { useStore } from "@/lib/store";
import { createClient } from "@/server/actions/client.action";
import { createProject } from "@/server/actions/project.action";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";
import type { ClientType } from "@/domain/types";

const colors = ["Bardhë - Bardhë", "Antracit 7016 - Bardhë", "Antracit 7016 - Antracit 7016", "Ngjyrë druri - Bardhë"];

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useApp();
  const clients = useStore((s) => s.clients);
  const systems = useStore((s) => s.pricing.systems);
  const company = useStore((s) => s.company);
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState<"choose" | "existing" | "new">("choose");
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [system, setSystem] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ClientType>("Privat");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("choose");
      setTitle("");
      setClientId(clients[0]?.id ?? "");
      setSystem(systems[0]?.name ?? "");
      setColor(colors[0]);
      setNewName("");
      setNewType("Privat");
      setError("");
    }
  }, [open, clients, systems]);

  // Projects are DB-backed (Phase 6): create via the server action, which
  // generates the tenant-safe number and computes nothing monetary here. The
  // configurator route re-hydrates the projects mirror, so the new project is
  // visible immediately after navigation.
  const create = async (finalClientId: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await createProject({
      clientId: finalClientId,
      title: title.trim() || "Projekt i ri",
      profileSystem: system || "",
      profileColor: color,
      vatRate: company.vatDefault / 100,
      status: "Draft",
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.fieldErrors?.title?.[0] ?? res.error.message);
      return;
    }
    toast("Projekti u krijua.");
    onClose();
    router.push(`/projects/${res.data.id}/configure?step=detajet`);
  };

  const submitExisting = () => {
    const c = clients.find((x) => x.id === clientId);
    if (!c) {
      setError("Zgjidhni një klient.");
      return;
    }
    void create(c.id);
  };

  // Client creation is DB-backed: create the tenant client via its server action,
  // then create the project referencing its server-generated UUID (the composite
  // FK guarantees the client belongs to this org).
  const submitNew = async () => {
    if (busy) return;
    const name = newName.trim();
    if (!name) {
      setError("Emri i klientit është i detyrueshëm.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await createClient({ name, type: newType });
    if (!res.ok) {
      setBusy(false);
      setError(res.error.fieldErrors?.name?.[0] ?? res.error.message);
      return;
    }
    setBusy(false);
    await create(res.data.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "choose" ? "Projekt i ri — klienti" : step === "existing" ? "Projekt për klient ekzistues" : "Projekt me klient të ri"}
      description={step === "choose" ? "Çdo projekt i përket një klienti. Zgjidhni si të vazhdohet:" : undefined}
      footer={
        step === "choose" ? (
          <Button variant="ghost" onClick={onClose}>Anulo</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep("choose")}>Prapa</Button>
            <Button disabled={busy} onClick={step === "existing" ? submitExisting : submitNew}>
              {busy ? "Duke krijuar…" : "Krijo projektin"}
            </Button>
          </>
        )
      }
    >
      {step === "choose" && (
        <div className="space-y-3">
          <button
            onClick={() => setStep(clients.length ? "existing" : "new")}
            disabled={!clients.length}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-200/40 disabled:opacity-50"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-slate-200 text-slate-900"><Users className="size-5" /></span>
            <span className="flex-1">
              <span className="block font-semibold text-slate-900">Klient ekzistues</span>
              <span className="block text-sm text-slate-400">Të dhënat e tij ngarkohen automatikisht.</span>
            </span>
            <ChevronRight className="size-4 text-slate-400" />
          </button>
          <button
            onClick={() => setStep("new")}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-200/40"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-500"><UserPlus className="size-5" /></span>
            <span className="flex-1">
              <span className="block font-semibold text-slate-900">Klient i ri</span>
              <span className="block text-sm text-slate-400">Regjistrohet bashkë me projektin, në një hap.</span>
            </span>
            <ChevronRight className="size-4 text-slate-400" />
          </button>
        </div>
      )}

      {step === "existing" && (
        <div className="space-y-4">
          <div>
            <Label>Klienti</Label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <ProjectFields title={title} setTitle={setTitle} system={system} setSystem={setSystem} color={color} setColor={setColor} systems={systems.map((s) => s.name)} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      )}

      {step === "new" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/60 p-1">
            {(["Privat", "Biznes"] as ClientType[]).map((t) => (
              <button key={t} onClick={() => setNewType(t)}
                className={cn("rounded-lg py-2 text-sm font-semibold transition-colors", newType === t ? "bg-slate-50 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700")}>{t}</button>
            ))}
          </div>
          <div>
            <Label>{newType === "Biznes" ? "Emri i biznesit *" : "Emri i klientit *"}</Label>
            <Input className="mt-1.5" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="P.sh. Agim Krasniqi" />
          </div>
          <ProjectFields title={title} setTitle={setTitle} system={system} setSystem={setSystem} color={color} setColor={setColor} systems={systems.map((s) => s.name)} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function ProjectFields({
  title, setTitle, system, setSystem, color, setColor, systems,
}: {
  title: string; setTitle: (v: string) => void;
  system: string; setSystem: (v: string) => void;
  color: string; setColor: (v: string) => void;
  systems: string[];
}) {
  return (
    <>
      <Field label="Titulli i projektit">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="P.sh. Banesë 3+1, kati 4" />
      </Field>
      <div>
        <Label>Sistemi i profilit</Label>
        <select value={system} onChange={(e) => setSystem(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500">
          {systems.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <Label>Ngjyra e profilit</Label>
        <select value={color} onChange={(e) => setColor(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500">
          {colors.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
    </>
  );
}
