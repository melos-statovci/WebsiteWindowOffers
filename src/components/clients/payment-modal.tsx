"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/overlay";
import { Button, Field, Input, Label } from "@/components/ui/kit";

export interface PaymentDraft {
  amount: number;
  date: string;
  method: string;
  note: string;
}

const methods = ["Para në dorë", "Transfertë bankare", "Kartelë"];

export function PaymentModal({
  open,
  onClose,
  onSubmit,
  suggestedAmount,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: PaymentDraft) => void;
  suggestedAmount?: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState(methods[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(suggestedAmount ? suggestedAmount.toFixed(2) : "");
      setDate(new Date().toISOString().slice(0, 10));
      setMethod(methods[0]);
      setNote("");
      setError("");
    }
  }, [open, suggestedAmount]);

  const submit = () => {
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) {
      setError("Shuma duhet të jetë më e madhe se zero.");
      return;
    }
    onSubmit({ amount: value, date, method, note });
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
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
          >
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <Field label="Shënim (opsional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="P.sh. paradhënie 50%" />
        </Field>
      </div>
    </Modal>
  );
}
