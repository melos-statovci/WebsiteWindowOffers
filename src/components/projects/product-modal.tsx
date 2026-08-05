"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/overlay";
import { Button, Field, Input, Label } from "@/components/ui/kit";
import type { OfferItem } from "@/types";

const kinds: OfferItem["kind"][] = ["Dritare", "Derë", "Rrëshqitëse", "Roletë"];

export function ProductModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<OfferItem, "id">) => void;
  initial?: OfferItem | null;
}) {
  const [kind, setKind] = useState<OfferItem["kind"]>("Dritare");
  const [label, setLabel] = useState("");
  const [width, setWidth] = useState("1000");
  const [height, setHeight] = useState("1200");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKind(initial?.kind ?? "Dritare");
      setLabel(initial?.label ?? "");
      setWidth(String(initial?.widthMm ?? 1000));
      setHeight(String(initial?.heightMm ?? 1200));
      setQty(String(initial?.qty ?? 1));
      setPrice(initial ? String(initial.unitPrice) : "");
      setErrors({});
    }
  }, [open, initial]);

  const submit = () => {
    const e: Record<string, string> = {};
    const q = parseInt(qty, 10);
    const p = parseFloat(price.replace(",", "."));
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (!q || q < 1) e.qty = "Sasia duhet të jetë të paktën 1.";
    if (Number.isNaN(p) || p < 0) e.price = "Çmimi nuk është i vlefshëm.";
    if (!w || w < 100) e.width = "Gjerësia e pavlefshme.";
    if (!h || h < 100) e.height = "Lartësia e pavlefshme.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ kind, label: label.trim() || kind, widthMm: w, heightMm: h, qty: q, unitPrice: p });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edito produktin" : "Shto produkt"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Anulo</Button>
          <Button onClick={submit}>{initial ? "Ruaj" : "Shto"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Lloji</Label>
          <select value={kind} onChange={(e) => setKind(e.target.value as OfferItem["kind"])}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500">
            {kinds.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <Field label="Përshkrimi">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="P.sh. Dritare me transom" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Gjerësia (mm)</Label>
            <Input className="mt-1.5" value={width} onChange={(e) => setWidth(e.target.value)} inputMode="numeric" aria-invalid={!!errors.width} />
            {errors.width && <p className="mt-1 text-xs text-rose-400">{errors.width}</p>}
          </div>
          <div>
            <Label>Lartësia (mm)</Label>
            <Input className="mt-1.5" value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" aria-invalid={!!errors.height} />
            {errors.height && <p className="mt-1 text-xs text-rose-400">{errors.height}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Sasia</Label>
            <Input className="mt-1.5" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" aria-invalid={!!errors.qty} />
            {errors.qty && <p className="mt-1 text-xs text-rose-400">{errors.qty}</p>}
          </div>
          <div>
            <Label>Çmimi për copë (€)</Label>
            <Input className="mt-1.5" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0.00" aria-invalid={!!errors.price} />
            {errors.price && <p className="mt-1 text-xs text-rose-400">{errors.price}</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
