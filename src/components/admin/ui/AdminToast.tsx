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
      setTimeout(onClose, 3000); // Allow exit animation to finish
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    error: <AlertCircle className="h-4 w-4 text-red-400" />,
    info: <Info className="h-4 w-4 text-blue-400" />,
  };

  const bgStyles = {
    success: "border-emerald-500/20",
    error: "border-red-500/20",
    info: "border-blue-500/20",
  };

  return (
    <div
      className={`
        fixed bottom-10 left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3
        rounded-2xl border bg-zinc-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl
        transition-all duration-300 ease-out-expo
        ${isExiting ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-4"}
        ${bgStyles[type]}
      `}
      role="status"
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="flex-1 text-[13px] font-medium text-zinc-100">{message}</p>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 300);
        }}
        className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
