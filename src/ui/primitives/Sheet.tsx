"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title affiché en haut de la sheet. */
  title?: ReactNode;
  /** Description optionnelle sous le title. */
  description?: ReactNode;
  /** Slot à droite du title (ex. menu …). */
  trailing?: ReactNode;
  /** Affiche un bouton close X à gauche du title (defaut true). */
  closeButton?: boolean;
  /** Affiche le drag handle iOS-style (defaut true). */
  handle?: boolean;
  /** Hauteur max en vh (defaut 92). Ignoré en CSS-only modal (toujours 100dvh). */
  maxVh?: number;
  /** Footer sticky (CTA principal). */
  footer?: ReactNode;
  /** Désactive le swipe-to-dismiss (utile en mode edit avec dirty). */
  dismissible?: boolean;
  /** Imbriquer dans une Sheet parente. */
  nested?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Modale full-viewport — pas de vaul, pas de listener visualViewport.
 *
 * Pattern 100 % CSS :
 * - position:fixed inset:0 height:100dvh maxHeight:100dvh overflow:hidden
 * - intérieur en flex column : header (shrink-0), liste (flex:1 overflow-y:auto), footer (shrink-0)
 * - quand le clavier iOS overlay, la modale reste pinée au viewport, et seule
 *   la liste interne scrolle. Pas de décalage du body.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trailing,
  closeButton = true,
  handle = true,
  footer,
  dismissible = true,
  nested = false,
  children,
  className,
}: SheetProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, dismissible, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="admin-theme"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: "100dvh",
        maxHeight: "100dvh",
        width: "100%",
        zIndex: nested ? 80 : 70,
      }}
      role="presentation"
    >
      {/* Overlay */}
      <div
        aria-hidden
        onClick={dismissible ? () => onOpenChange(false) : undefined}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Modale */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "mx-auto flex w-full max-w-[var(--admin-app-max-width)] flex-col bg-[var(--admin-surface)] outline-none",
          className,
        )}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100dvh",
          maxHeight: "100dvh",
        }}
      >
        {handle ? <div className="admin-sheet-handle shrink-0" /> : null}

        {title || closeButton || trailing ? (
          <div
            className="shrink-0 flex items-center gap-2 px-4 pb-3 pt-3"
            style={{
              borderBottom: "1px solid var(--admin-border)",
              paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
            }}
          >
            {closeButton ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Fermer"
                className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--admin-text-muted)] tap-scale hover:bg-[var(--admin-surface-muted)]"
              >
                <X size={20} />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              {title ? (
                <h2
                  id={titleId}
                  className="text-[16px] font-semibold leading-tight text-[var(--admin-text)] truncate"
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  id={descId}
                  className="mt-0.5 text-[12px] text-[var(--admin-text-muted)] truncate"
                >
                  {description}
                </p>
              ) : null}
            </div>
            {trailing ? <div className="shrink-0">{trailing}</div> : null}
          </div>
        ) : null}

        {/* Zone scrollable — flex:1 overflow-y:auto, seul cet espace scrolle */}
        <div
          className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain px-4", footer ? "pt-3 pb-3" : "py-4")}
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: footer ? undefined : "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>

        {footer ? (
          <div
            className="shrink-0 px-4 pt-3"
            style={{
              borderTop: "1px solid var(--admin-border)",
              paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
              background: "var(--admin-surface)",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
