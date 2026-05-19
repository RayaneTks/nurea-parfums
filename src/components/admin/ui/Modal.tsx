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
  const descId = useId();
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
        if (!first || !last) return;
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
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [isRendered, onClose, dismissible]);

  if (!isRendered) return null;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[150] w-full overflow-hidden admin-theme",
        "flex items-stretch justify-center sm:items-center sm:p-4",
        "bg-[var(--admin-overlay)] backdrop-blur-sm",
        isClosing
          ? "animate-out fade-out duration-200"
          : "animate-in fade-in duration-200",
      )}
      style={{
        /* CSS-only — pas de variables JS. La modale fait toujours la taille
           du viewport disponible. Le clavier iOS overlay simplement le bas
           et le contenu interne scrolle. */
        height: "100dvh",
        maxHeight: "100dvh",
      }}
      onClick={dismissible && !isClosing ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full min-w-0 max-w-full sm:rounded-3xl",
          "bg-admin-surface border border-admin-border",
          "shadow-admin-xl",
          "flex flex-col",
          isClosing
            ? "animate-out fade-out duration-200 sm:zoom-out-95"
            : "animate-in fade-in duration-300 sm:zoom-in-95",
          sizes[size],
        )}
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
        }}
      >
        <div className="relative flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div
            aria-hidden
            className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-admin-border sm:hidden"
          />
          <div className="min-w-0 flex-1 pt-1">
            <h2
              id={titleId}
              className="font-sans text-[1.25rem] font-bold leading-tight tracking-tight text-admin-text sm:text-[1.375rem]"
            >
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1.5 text-[13px] leading-snug text-admin-muted">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="shrink-0 h-11 w-11 flex items-center justify-center rounded-full text-admin-subtle transition-colors tap-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:text-admin-text"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="border-t border-admin-border" />
        <div className="flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 pb-[max(1.25rem,max(16px,env(safe-area-inset-bottom,16px)))] [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-admin-border px-5 py-4 pb-[max(1rem,max(16px,env(safe-area-inset-bottom,16px)))] bg-admin-surface rounded-b-3xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
