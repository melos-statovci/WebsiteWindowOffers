"use client";

// Security page — REAL, backed by Better Auth (Phase 8). Previously this whole
// screen was a local simulation ("Demo lokale"). Now:
//   - Password change  -> authClient.changePassword (real; can revoke other
//     sessions on change).
//   - Active sessions  -> authClient.listSessions / revokeSession /
//     revokeOtherSessions (real device/session management for this account).
//   - 2FA              -> honestly deferred (needs the Better Auth twoFactor
//     plugin + a schema migration); shown as unavailable, not faked.
// The old fake device list, login history, support-access toggle and simulated
// 2FA/QR flow are removed — nothing here pretends to protect the account anymore.

import { useCallback, useEffect, useState } from "react";
import {
  Smartphone, KeyRound, Monitor, Laptop, LogOut, ShieldCheck,
} from "lucide-react";
import { PageHeader, Button, Badge, SectionCard, Field, Input, Label } from "@/components/ui/kit";
import { Modal } from "@/components/ui/overlay";
import { authClient, useSession } from "@/auth/client";
import { useApp } from "@/components/providers/providers";

interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
  expiresAt: string | Date;
}

/** Friendly "Browser · OS" label from a user-agent string. */
function describeUserAgent(ua?: string | null): string {
  if (!ua) return "Pajisje e panjohur";
  const browser = /Edg/.test(ua) ? "Edge" : /OPR|Opera/.test(ua) ? "Opera" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : /Firefox/.test(ua) ? "Firefox" : "Shfletues";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}
function fmt(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("sq");
}

export default function SecurityPage() {
  const { toast, confirm } = useApp();
  const { data: session } = useSession();
  const currentToken = session?.session.token;

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [pwModal, setPwModal] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    const res = await authClient.listSessions();
    if (!res.error && res.data) {
      setSessions(
        [...(res.data as unknown as SessionRow[])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    }
    setLoadingSessions(false);
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const revokeOne = async (s: SessionRow) => {
    const ok = await confirm({ title: "Dil nga pajisja?", message: `Sesioni në ${describeUserAgent(s.userAgent)} do të mbyllet.`, confirmLabel: "Dil", danger: true });
    if (!ok) return;
    const res = await authClient.revokeSession({ token: s.token });
    if (res.error) { toast(res.error.message ?? "Nuk u mbyll dot sesioni."); return; }
    toast("Sesioni u mbyll.");
    void loadSessions();
  };
  const revokeOthers = async () => {
    const ok = await confirm({ title: "Dil nga të gjitha të tjerat?", message: "Të gjitha sesionet përveç kësaj pajisje do të mbyllen.", confirmLabel: "Dil", danger: true });
    if (!ok) return;
    const res = await authClient.revokeOtherSessions();
    if (res.error) { toast(res.error.message ?? "Nuk u mbyllën dot sesionet."); return; }
    toast("Dolët nga pajisjet e tjera.");
    void loadSessions();
  };

  const submitPw = async () => {
    if (pw.next.length < 8) { setPwError("Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere."); return; }
    if (pw.next !== pw.confirm) { setPwError("Fjalëkalimet nuk përputhen."); return; }
    setPwError(""); setPwBusy(true);
    try {
      const res = await authClient.changePassword({
        currentPassword: pw.current,
        newPassword: pw.next,
        revokeOtherSessions: true,
      });
      if (res.error) {
        setPwError(res.error.message ?? "Ndryshimi dështoi. Kontrolloni fjalëkalimin aktual.");
        return;
      }
      setPw({ current: "", next: "", confirm: "" });
      setPwModal(false);
      toast("Fjalëkalimi u ndryshua. Sesionet e tjera u mbyllën.");
      void loadSessions();
    } finally {
      setPwBusy(false);
    }
  };

  const others = sessions.filter((s) => s.token !== currentToken);

  return (
    <div>
      <PageHeader title="Siguria" subtitle="Fjalëkalimi dhe sesionet aktive të llogarisë suaj." />

      <div className="space-y-5">
        <SectionCard title={<span className="flex items-center gap-2"><KeyRound className="size-5 text-slate-900" /> Fjalëkalimi</span>}>
          <p className="mb-4 text-sm text-slate-400">Ndryshimi i fjalëkalimit mbyll automatikisht të gjitha sesionet e tjera.</p>
          <Button variant="outline" onClick={() => setPwModal(true)}>Ndrysho fjalëkalimin</Button>
        </SectionCard>

        <SectionCard
          title={<span className="flex items-center gap-2"><Monitor className="size-5 text-slate-900" /> Sesionet aktive ({sessions.length})</span>}
          action={others.length > 0 ? <Button variant="danger" size="sm" onClick={revokeOthers}>Dil nga të gjitha të tjerat</Button> : undefined}
        >
          {loadingSessions ? (
            <p className="text-sm text-slate-400">Duke ngarkuar sesionet…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-400">Asnjë sesion aktiv.</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s) => {
                const isCurrent = s.token === currentToken;
                const mobile = /iPhone|iPad|Android/.test(s.userAgent ?? "");
                const Icon = mobile ? Smartphone : Laptop;
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 size-5 shrink-0 text-slate-500" />
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          {describeUserAgent(s.userAgent)}
                          {isCurrent && <Badge tone="emerald">Kjo pajisje</Badge>}
                        </div>
                        <div className="text-xs text-slate-400">{s.ipAddress || "IP e panjohur"} · kyçur: {fmt(s.createdAt)}</div>
                        <div className="text-xs text-slate-400">skadon: {fmt(s.expiresAt)}</div>
                      </div>
                    </div>
                    {!isCurrent && <Button size="sm" variant="ghost" onClick={() => revokeOne(s)}><LogOut className="size-4" /> Dil</Button>}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={<span className="flex items-center gap-2"><Smartphone className="size-5 text-slate-900" /> Verifikimi në dy hapa (2FA)</span>}
          action={<Badge tone="amber">Së shpejti</Badge>}
        >
          <p className="text-sm text-slate-400">
            Verifikimi në dy hapa nuk është ende i disponueshëm. Do të aktivizohet në një përditësim të ardhshëm — deri atëherë nuk shfaqet asnjë kontroll që s&apos;funksionon vërtet.
          </p>
        </SectionCard>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          <ShieldCheck className="size-4 shrink-0" />
          Fjalëkalimet ruhen të hashuara nga Better Auth; asnjë fjalëkalim nuk shfaqet ose regjistrohet.
        </div>
      </div>

      {/* Password change modal */}
      <Modal open={pwModal} onClose={() => { setPwModal(false); setPw({ current: "", next: "", confirm: "" }); setPwError(""); }} title="Ndrysho fjalëkalimin"
        description="Do të kërkohet fjalëkalimi aktual. Sesionet e tjera do të mbyllen."
        footer={<><Button variant="ghost" onClick={() => { setPwModal(false); setPw({ current: "", next: "", confirm: "" }); setPwError(""); }}>Anulo</Button><Button onClick={submitPw} disabled={pwBusy}>{pwBusy ? "Duke ndryshuar…" : "Ndrysho"}</Button></>}>
        <div className="space-y-4">
          <Field label="Fjalëkalimi aktual"><Input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" /></Field>
          <Field label="Fjalëkalimi i ri"><Input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} autoComplete="new-password" /></Field>
          <div>
            <Label>Konfirmo fjalëkalimin</Label>
            <Input className="mt-1.5" type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" aria-invalid={!!pwError} />
            {pwError && <p className="mt-1 text-xs text-rose-400">{pwError}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
