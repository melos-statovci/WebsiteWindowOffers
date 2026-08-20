"use client";

// Lightweight client tab switcher for the org detail view, so the screen reads
// as an account-management console (Overview / Members / Usage / Account) rather
// than one long dump. Panels are rendered server-side and passed in as nodes;
// this only toggles which one is visible.

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function DetailTabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active === t.id
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} className={cn(active === t.id ? "block" : "hidden")}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
