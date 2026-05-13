"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

type ToastProps = {
  type?: ToastType;
  message: string;
  duration?: number;
  onClose: () => void;
};

const iconByType = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

const styleByType: Record<ToastType, { bg: string; fg: string; border: string }> = {
  success: { bg: "var(--admin-success-bg)", fg: "var(--admin-success)", border: "var(--admin-success)" },
  error: { bg: "var(--admin-danger-bg)", fg: "var(--admin-danger)", border: "var(--admin-danger)" },
  info: { bg: "var(--admin-info-bg)", fg: "var(--admin-info)", border: "var(--admin-info)" },
};

export function Toast({ type = "success", message, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const s = styleByType[type];

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[95]",
        "flex items-start gap-3 rounded-[14px] px-4 py-3 shadow-[var(--admin-shadow-lg)]",
        "max-w-[min(92vw,400px)] w-full",
        "motion-safe:animate-in motion-safe:slide-in-from-bottom-4",
      )}
      style={{
        bottom: "calc(var(--admin-tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px)",
        background: "var(--admin-surface)",
        border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ color: s.fg }} aria-hidden className="shrink-0 mt-0.5">
        {iconByType[type]}
      </span>
      <p className="flex-1 text-[14px] leading-snug text-[var(--admin-text)]">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="-mr-1 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--admin-text-subtle)] tap-scale hover:bg-[var(--admin-surface-muted)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
