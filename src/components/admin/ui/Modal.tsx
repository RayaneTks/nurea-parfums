"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
}

const sizes: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const EXIT_MS = 220;
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [isRendered, setIsRendered] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }
    if (!isRendered) return;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, isRendered]);

  useEffect(() => {
    if (!isRendered) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lastFocusedRef.current = previouslyFocused;

    const getFocusable = () =>
      dialogRef.current
        ? [
            ...dialogRef.current.querySelectorAll<HTMLElement>(
              'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
            ),
          ]
        : [];

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusables = getFocusable();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (!active || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const first = getFocusable()[0];
    first?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [isRendered, onClose, dismissible]);

  if (!isRendered) return null;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[150] admin-theme",
        "flex items-end sm:items-center justify-center sm:p-4",
        "bg-[var(--admin-overlay)] backdrop-blur-sm",
        isClosing
          ? "animate-out fade-out duration-200"
          : "animate-in fade-in duration-200",
      )}
      onClick={dismissible && !isClosing ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full rounded-t-3xl sm:rounded-3xl",
          "bg-admin-surface border border-admin-border",
          "shadow-admin-xl",
          "flex flex-col max-h-[92dvh]",
          isClosing
            ? "animate-out slide-out-to-bottom-full sm:zoom-out-95 sm:slide-out-to-bottom-0 duration-200 ease-out-expo"
            : "animate-in slide-in-from-bottom-full sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-300 ease-out-expo",
          sizes[size],
        )}
      >
        <div className="relative flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div
            aria-hidden
            className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-admin-border sm:hidden"
          />
          <div className="min-w-0 flex-1 pt-1">
            <h2
              id={titleId}
              className="font-serif text-[22px] leading-[1.15] tracking-[-0.01em] text-admin-text"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-[13px] text-admin-muted">{description}</p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="shrink-0 h-11 w-11 flex items-center justify-center rounded-full text-admin-subtle transition-colors tap-scale [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:text-admin-text"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="border-t border-admin-border" />
        <div className="flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-admin-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-admin-surface rounded-b-3xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
