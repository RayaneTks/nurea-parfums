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
        "fixed left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border p-4",
        "bg-admin-surface/95 backdrop-blur-xl shadow-admin-xl",
        "transition-all duration-300 ease-out-expo",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
        isExiting || !isEntered
          ? "opacity-0 translate-y-3 scale-[0.98]"
          : "opacity-100 translate-y-0 scale-100",
        borderByType[type],
      )}
    >
      <div className="shrink-0 pt-0.5">{icons[type]}</div>
      <div className="flex-1 text-[14px] leading-snug text-admin-text">
        {emphasis ? (
          <p className="text-[11px] uppercase tracking-wider text-admin-muted mb-0.5 font-medium">
            {emphasis}
          </p>
        ) : null}
        <p>{message}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          window.setTimeout(onClose, EXIT_MS);
        }}
        aria-label="Fermer la notification"
        className="shrink-0 h-11 w-11 flex items-center justify-center rounded-full text-admin-subtle transition-colors [@media(hover:hover)]:hover:text-admin-text tap-scale"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
