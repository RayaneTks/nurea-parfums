"use client";

import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function AdminToast({ message, type = "success", duration = 3200, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 280);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-[var(--admin-success)]" strokeWidth={2} />,
    error: <AlertCircle className="h-5 w-5 text-[var(--admin-danger)]" strokeWidth={2} />,
    info: <Info className="h-5 w-5 text-[var(--admin-accent)]" strokeWidth={2} />,
  };

  return (
    <div
      className={`
        fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3
        rounded-[14px] border border-[var(--admin-separator)] bg-[var(--admin-elevated)]/95 px-4 py-3.5 shadow-lg backdrop-blur-xl
        transition-opacity duration-200 ease-out
        ${isExiting ? "opacity-0" : "opacity-100"}
      `}
      role="status"
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="flex-1 text-[15px] font-normal leading-snug text-[var(--admin-text)]">{message}</p>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 180);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[var(--admin-muted)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}
