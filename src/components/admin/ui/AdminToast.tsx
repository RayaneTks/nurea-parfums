"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  emphasis?: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const icons = {
  success: <CheckCircle2 className="h-[18px] w-[18px] text-[var(--admin-success)]" aria-hidden />,
  error: <AlertCircle className="h-[18px] w-[18px] text-admin-danger" aria-hidden />,
  info: <Info className="h-[18px] w-[18px] text-[var(--admin-info)]" aria-hidden />,
};

const borderByType: Record<ToastType, string> = {
  success: "border-[var(--admin-success-border)]",
  error: "border-[var(--admin-danger-border)]",
  info: "border-[var(--admin-info-border)]",
};

export function AdminToast({ message, emphasis, type = "success", duration = 3000, onClose }: ToastProps) {
  const EXIT_MS = 280;
  const [isExiting, setIsExiting] = useState(false);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    const enterTimer = window.requestAnimationFrame(() => setIsEntered(true));
    const timer = window.setTimeout(() => {
      setIsExiting(true);
      window.setTimeout(onClose, EXIT_MS);
    }, duration);
    return () => {
      window.cancelAnimationFrame(enterTimer);
      window.clearTimeout(timer);
    };
  }, [duration, onClose]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "fixed left-1/2 z-[300] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border p-4",
        "bg-white text-[var(--admin-text)] shadow-[0_8px_30px_rgba(15,15,20,0.12)]",
        "ring-1 ring-black/10 [color-scheme:light]",
        "transition-all duration-300 ease-out-expo",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
        isExiting || !isEntered
          ? "opacity-0 translate-y-3 scale-[0.98]"
          : "opacity-100 translate-y-0 scale-100",
        borderByType[type],
      )}
    >
      <div className="shrink-0 pt-0.5">{icons[type]}</div>
      <div className="min-w-0 flex-1 text-base font-medium leading-snug text-neutral-900 break-words">
        {emphasis ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            {emphasis}
          </p>
        ) : null}
        <p className="text-[15px] sm:text-base">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          window.setTimeout(onClose, EXIT_MS);
        }}
        aria-label="Fermer la notification"
        className="shrink-0 h-11 w-11 flex items-center justify-center rounded-full text-neutral-500 transition-colors [@media(hover:hover)]:hover:text-neutral-900 tap-scale"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
