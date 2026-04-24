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

export function AdminToast({ message, type = "success", duration = 3000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-[var(--admin-success)]" />,
    error: <AlertCircle className="h-4 w-4 text-[var(--admin-danger)]" />,
    info: <Info className="h-4 w-4 text-[var(--admin-accent-solid)]" />,
  };

  const borderStyles = {
    success: "border-[rgba(123,201,164,0.45)]",
    error: "border-[rgba(224,122,122,0.45)]",
    info: "border-[rgba(216,128,128,0.35)]",
  };

  return (
    <div
      className={`
        fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3
        border bg-[var(--admin-surface)]/98 p-4 shadow-lg backdrop-blur-md
        transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isExiting ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}
        ${borderStyles[type]}
      `}
      role="status"
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="flex-1 text-[13px] font-medium text-[var(--admin-text)]">{message}</p>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 200);
        }}
        className="shrink-0 text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
