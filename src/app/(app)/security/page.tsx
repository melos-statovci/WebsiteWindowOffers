"use client";

import { useState } from "react";
import {
  ShieldCheck, Smartphone, KeyRound, Monitor, CheckCircle2, XCircle, LockKeyhole, QrCode,
} from "lucide-react";
import { PageHeader, Button, Badge, SectionCard, Field, Input, Label } from "@/components/ui/kit";
import { Modal } from "@/components/ui/overlay";
import { devices as seedDevices, loginHistory } from "@/lib/mock/data";
import { useApp } from "@/components/providers/providers";
import type { Device } from "@/types";

export default function SecurityPage() {
  const { toast, confirm } = useApp();
  const [devices, setDevices] = useState<Device[]>(seedDevices);
  const [twoFA, setTwoFA] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [twoFaModal, setTwoFaModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const logoutDevice = async (d: Device) => {
    const ok = await confirm({ title: "Dil nga pajisja?", message: `Sesioni në ${d.browser} · ${d.os} do të mbyllet.`, confirmLabel: "Dil", danger: true });
    if (ok) { setDevices((ds) => ds.filter((x) => x.id !== d.id)); toast("Dolët nga pajisja (simulim lokal)."); }
  };
  const logoutOthers = async () => {
    const ok = await confirm({ title: "Dil nga të gjitha të tjerat?", message: "Të gjitha sesionet përveç kësaj pajisje do të mbyllen.", confirmLabel: "Dil", danger: true });
    if (ok) { setDevices((ds) => ds.filter((x) => x.current)); toast("Dolët nga pajisjet e tjera (simulim lokal)."); }
  };

  const verify2fa = () => {
    if (!/^\d{6}$/.test(code)) { toast("Shkruani kodin 6-shifror."); return; }
    setTwoFA(true); setTwoFaModal(false); setCode("");
    toast("2FA u aktivizua (simulim lokal — asnjë sekret real nuk ruhet).");
  };
  const submitPw = () => {
    if (pw.next.length < 8) { setPwError("Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere."); return; }
    if (pw.next !== pw.confirm) { setPwError("Fjalëkalimet nuk përputhen."); return; }
    // NOTE: nothing is stored — this is a harmless local simulation.
    setPw({ current: "", next: "", confirm: "" }); setPwError(""); setPwModal(false);
    toast("Fjalëkalimi u ndryshua (simulim lokal — asgjë nuk ruhet).");
  };

  return (
    <div>
      <PageHeader title="Siguria" subtitle="Kush kyçet, nga cilat pajisje, dhe çdo qasje e support-it — transparencë e plotë." />

      <div className="space-y-5">
        <SectionCard title={<span className="flex items-center gap-2"><LockKeyhole className="size-5 text-slate-900" /> Qasja e support-it</span>}>
          <p className="mb-4 text-sm text-slate-400">Të dhënat tuaja i sheh vetëm kompania juaj. Stafi i Kornizo-s i qaset VETËM brenda një dritareje të përkohshme që e hapni ju.</p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">
              {supportOpen ? "E hapur — support-i mund të qaset (24 orë)" : "E mbyllur — të dhënat i shihni vetëm ju"}
            </span>
            <Button variant={supportOpen ? "danger" : "outline"}
              onClick={() => { setSupportOpen((v) => !v); toast(supportOpen ? "Qasja u mbyll." : "Qasja u hap për 24 orë (simulim lokal)."); }}>
              {supportOpen ? "Mbylle qasjen" : "Hape për 24 orë"}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><Smartphone className="size-5 text-slate-900" /> Verifikimi në dy hapa (2FA)</span>}
          action={<Badge tone={twoFA ? "emerald" : "amber"}>{twoFA ? "Aktiv" : "Joaktiv"}</Badge>}>
          <p className="mb-4 text-sm text-slate-400">Një kod 6-shifror nga aplikacioni Authenticator kërkohet në çdo kyçje — edhe nëse dikush e di fjalëkalimin, s&apos;hyn dot pa telefonin tuaj.</p>
          {twoFA ? (
            <Button variant="danger" onClick={() => { setTwoFA(false); toast("2FA u çaktivizua (simulim lokal)."); }}>Çaktivizo 2FA</Button>
          ) : (
            <Button onClick={() => setTwoFaModal(true)}>Aktivizo 2FA</Button>
          )}
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><KeyRound className="size-5 text-slate-900" /> Fjalëkalimi</span>}>
          <p className="mb-4 text-sm text-slate-400">Ndryshoni fjalëkalimin tuaj rregullisht për siguri.</p>
          <Button variant="outline" onClick={() => setPwModal(true)}>Ndrysho fjalëkalimin</Button>
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><Monitor className="size-5 text-slate-900" /> Pajisjet e kyçura ({devices.length})</span>}
          action={devices.some((d) => !d.current) ? <Button variant="danger" size="sm" onClick={logoutOthers}>Dil nga të gjitha të tjerat</Button> : undefined}>
          <ul className="space-y-3">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">{d.owner}{d.current && <Badge tone="emerald">Kjo pajisje</Badge>}</div>
                  <div className="text-xs text-slate-400">{d.browser} · {d.os} · {d.ip}</div>
                  <div className="text-xs text-slate-400">aktive: {d.lastActive} · kyçur: {d.loggedInAt}</div>
                </div>
                {!d.current && <Button size="sm" variant="ghost" onClick={() => logoutDevice(d)}>Dil</Button>}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Historiku i kyçjeve">
          <ul className="space-y-2">
            {loginHistory.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                {e.kind === "success" ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> : <XCircle className="size-5 shrink-0 text-rose-400" />}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{e.kind === "success" ? "Kyçje e suksesshme" : "Kyçje e dështuar"} — {e.who}</div>
                  <div className="truncate text-xs text-slate-400">{e.device} · {e.ip} · {e.at}</div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-500" /> Transparenca e support-it</span>}>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-500">
            <CheckCircle2 className="size-4" />
            {supportOpen ? "Qasja e support-it është e hapur aktualisht (simulim lokal)." : "Asnjë qasje e support-it deri më sot — të dhënat tuaja i shihni vetëm ju."}
          </div>
        </SectionCard>
      </div>

      {/* 2FA setup modal */}
      <Modal open={twoFaModal} onClose={() => { setTwoFaModal(false); setCode(""); }} title="Aktivizo 2FA"
        description="Skanoni kodin me aplikacionin Authenticator dhe shkruani kodin 6-shifror."
        footer={<><Button variant="ghost" onClick={() => { setTwoFaModal(false); setCode(""); }}>Anulo</Button><Button onClick={verify2fa}>Verifiko & aktivizo</Button></>}>
        <div className="space-y-4">
          <div className="mx-auto grid size-40 place-items-center rounded-xl border border-slate-200 bg-white text-slate-300">
            <QrCode className="size-20" />
          </div>
          <p className="text-center text-xs text-slate-400">Kod demonstrimi — nuk gjenerohet asnjë sekret real 2FA.</p>
          <Field label="Kodi 6-shifror">
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" className="text-center tracking-[0.4em]" />
          </Field>
        </div>
      </Modal>

      {/* Password change modal */}
      <Modal open={pwModal} onClose={() => { setPwModal(false); setPw({ current: "", next: "", confirm: "" }); setPwError(""); }} title="Ndrysho fjalëkalimin"
        description="Simulim lokal — asnjë fjalëkalim nuk ruhet ose dërgohet."
        footer={<><Button variant="ghost" onClick={() => { setPwModal(false); setPw({ current: "", next: "", confirm: "" }); setPwError(""); }}>Anulo</Button><Button onClick={submitPw}>Ndrysho</Button></>}>
        <div className="space-y-4">
          <Field label="Fjalëkalimi aktual"><Input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} autoComplete="off" /></Field>
          <Field label="Fjalëkalimi i ri"><Input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} autoComplete="off" /></Field>
          <div>
            <Label>Konfirmo fjalëkalimin</Label>
            <Input className="mt-1.5" type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="off" aria-invalid={!!pwError} />
            {pwError && <p className="mt-1 text-xs text-rose-400">{pwError}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
