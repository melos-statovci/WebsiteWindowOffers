"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// Modal — centered dialog with backdrop, Escape/outside close, focus handling
// ---------------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(
        "input,textarea,select,button[data-autofocus]",
      );
      el?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Mbyll"
            className="-mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-900"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmDialog — controlled confirmation used by the promise-based useConfirm
// ---------------------------------------------------------------------------
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  options,
  onResolve,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onResolve: (v: boolean) => void;
}) {
  return (
    <Modal
      open={open && !!options}
      onClose={() => onResolve(false)}
      title={options?.title ?? ""}
      description={options?.message}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onResolve(false)}>
            {options?.cancelLabel ?? "Anulo"}
          </Button>
          <Button
            variant={options?.danger ? "danger" : "primary"}
            data-autofocus
            onClick={() => onResolve(true)}
          >
            {options?.confirmLabel ?? "Konfirmo"}
          </Button>
        </>
      }
    >
      <span className="sr-only">{options?.message}</span>
    </Modal>
  );
}
