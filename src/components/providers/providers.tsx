"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStore } from "@/lib/store";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/overlay";

type Theme = "dark" | "light";
type Overlay = null | "help" | "config" | "search";

interface Toast {
  id: number;
  message: string;
}

interface AppState {
  theme: Theme;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (v: boolean) => void;
  toasts: Toast[];
  toast: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within <Providers>");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions | null;
    resolve: ((v: boolean) => void) | null;
  }>({ options: null, resolve: null });

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ options, resolve });
      }),
    [],
  );

  const resolveConfirm = useCallback(
    (v: boolean) => {
      confirmState.resolve?.(v);
      setConfirmState({ options: null, resolve: null });
    },
    [confirmState],
  );

  // Rehydrate the persisted app store on the client (skipHydration is set on
  // the store to avoid SSR mismatches).
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  // Hydrate persisted prefs on mount. Reading from localStorage (an external
  // store) after mount is intentional and avoids SSR hydration mismatches; the
  // no-flash class is applied by the inline script in the document head.
  useEffect(() => {
    try {
      const t = (localStorage.getItem("theme") as Theme) || "dark";
      const collapsed = localStorage.getItem("sidebarCollapsed") === "true";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(t);
      setSidebarCollapsed(collapsed);
    } catch {
      /* ignore */
    }
  }, []);

  // Only sync the <html> class here; persistence happens in toggleTheme so a
  // remount can't transiently clobber the stored value before hydration runs.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(
    () =>
      setTheme((t) => {
        const next = t === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("theme", next);
        } catch {
          /* ignore */
        }
        return next;
      }),
    [],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebarCollapsed", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts((list) => [...list, { id, message }]);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Close overlays on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOverlay(null);
        setNotificationsOpen(false);
        setMobileNavOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay((o) => (o === "search" ? null : "search"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      theme,
      toggleTheme,
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      setMobileNavOpen,
      overlay,
      setOverlay,
      notificationsOpen,
      setNotificationsOpen,
      toasts,
      toast,
      confirm,
    }),
    [
      theme,
      toggleTheme,
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      overlay,
      notificationsOpen,
      toasts,
      toast,
      confirm,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <Toaster toasts={toasts} />
      <ConfirmDialog
        open={!!confirmState.options}
        options={confirmState.options}
        onResolve={resolveConfirm}
      />
    </Ctx.Provider>
  );
}

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900 shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
