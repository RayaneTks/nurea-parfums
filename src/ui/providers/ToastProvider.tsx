"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

type ToastApi = {
  show: (message: string, opts?: { type?: ToastType; duration?: number }) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Stack max — au-delà on remplace les plus anciens (FIFO). */
const MAX_VISIBLE = 3;

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* iOS Safari/PWA : navigator.vibrate peut throw silencieusement */
  }
}

const HAPTIC_BY_TYPE: Record<ToastType, number | number[]> = {
  success: [10, 50, 10],
  error: [30, 100, 30],
  info: 10,
};

const ICON_BY_TYPE = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const STYLE_BY_TYPE: Record<ToastType, { fg: string; border: string }> = {
  success: { fg: "var(--admin-success)", border: "var(--admin-success)" },
  error: { fg: "var(--admin-danger)", border: "var(--admin-danger)" },
  info: { fg: "var(--admin-info)", border: "var(--admin-info)" },
};

function makeId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>((message, opts) => {
    const id = makeId();
    const type: ToastType = opts?.type ?? "info";
    const duration = opts?.duration ?? 3000;
    setItems((prev) => {
      const next = [...prev, { id, type, message, duration }];
      // Garde au plus MAX_VISIBLE en stack ; les plus anciens dégagent.
      return next.slice(-MAX_VISIBLE);
    });
    vibrate(HAPTIC_BY_TYPE[type]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, duration) => show(message, { type: "success", duration }),
      error: (message, duration) => show(message, { type: "error", duration }),
      info: (message, duration) => show(message, { type: "info", duration }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast() doit être utilisé dans un <ToastProvider /> (cf. app/admin/layout.tsx).",
    );
  }
  return ctx;
}

type ViewportProps = {
  items: ToastItem[];
  onDismiss: (id: string) => void;
};

function ToastViewport({ items, onDismiss }: ViewportProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[95] flex flex-col items-center gap-2 w-full max-w-[min(92vw,400px)]"
      style={{
        bottom: "calc(var(--admin-tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px)",
      }}
    >
      {items.map((t) => (
        <ToastView key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { id, type, message, duration } = toast;
  const Icon = ICON_BY_TYPE[type];
  const style = STYLE_BY_TYPE[type];
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (duration <= 0) return;
    timeoutRef.current = setTimeout(() => onDismiss(id), duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, id, onDismiss]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto w-full",
        "flex items-start gap-3 rounded-[14px] px-4 py-3 shadow-[var(--admin-shadow-lg)]",
        "motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in-0",
      )}
      style={{
        background: "var(--admin-surface)",
        border: `1px solid ${style.border}`,
      }}
    >
      <span style={{ color: style.fg }} aria-hidden className="shrink-0 mt-0.5">
        <Icon size={18} />
      </span>
      <p className="flex-1 text-[14px] leading-snug text-[var(--admin-text)]">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Fermer"
        className="-mr-1 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--admin-text-subtle)] tap-scale hover:bg-[var(--admin-surface-muted)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
