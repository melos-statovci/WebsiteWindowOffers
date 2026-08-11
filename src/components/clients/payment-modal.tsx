"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/overlay";
import { Button, Field, Input, Label } from "@/components/ui/kit";

export interface PaymentDraft {
  amount: number;
  date: string;
  method: string;
  note: string;
  /** Set when the user knowingly pays more than the balance (→ client credit). */
  allowCredit?: boolean;
}

const methods = ["Para në dorë", "Transfertë bankare", "Kartelë"];

export function PaymentModal({
  open,
  onClose,
  onSubmit,
  suggestedAmount,
  maxAmount,
  allowCreditToggle = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: PaymentDraft) => void;
  suggestedAmount?: number;
  /** Invoice balance — payments above it require the credit toggle. */
  maxAmount?: number;
  /** Show the "allow overpayment as credit" checkbox. */
  allowCreditToggle?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState(methods[0]);
  const [note, setNote] = useState("");
  const [allowCredit, setAllowCredit] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setAmount(suggestedAmount ? suggestedAmount.toFixed(2) : "");
      setDate(new Date().toISOString().slice(0, 10));
      setMethod(methods[0]);
      setNote("");
      setAllowCredit(false);
      setError("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, suggestedAmount]);

  const submit = () => {
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) {
      setError("Shuma duhet të jetë më e madhe se zero.");
      return;
    }
    if (maxAmount != null && value > maxAmount + 0.005 && !allowCredit) {
      setError(`Shuma tejkalon mbetjen e faturës (${maxAmount.toFixed(2)} €). Aktivizoni kredinë për ta lejuar.`);
      return;
    }
    onSubmit({ amount: value, date, method, note, allowCredit });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Shto pagesë"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Anulo
          </Button>
          <Button onClick={submit}>Ruaj pagesën</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Shuma (€) *</Label>
          <Input
            className="mt-1.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            aria-invalid={!!error}
          />
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </div>
        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div>
          <Label>Mënyra e pagesës</Label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500"
          >
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <Field label="Shënim (opsional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="P.sh. paradhënie 50%" />
        </Field>
        {allowCreditToggle && (
          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <input type="checkbox" checked={allowCredit} onChange={(e) => setAllowCredit(e.target.checked)} className="mt-0.5 size-4 accent-slate-500" />
            <span>
              <span className="font-semibold text-slate-900">Lejo mbipagesë si kredi klienti</span>
              <span className="mt-0.5 block text-xs text-slate-400">Nëse shuma tejkalon mbetjen, teprica ruhet si kredi për klientin.</span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}
