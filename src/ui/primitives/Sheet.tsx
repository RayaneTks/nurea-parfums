"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";
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
  /** Hauteur max en vh (defaut 92). */
  maxVh?: number;
  /** Footer sticky (CTA principal). */
  footer?: ReactNode;
  /** Désactive le swipe-to-dismiss (utile en mode edit avec dirty). */
  dismissible?: boolean;
  children: ReactNode;
  className?: string;
};

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trailing,
  closeButton = true,
  handle = true,
  maxVh = 92,
  footer,
  dismissible = true,
  children,
  className,
}: SheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
      dismissible={dismissible}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          style={{ zIndex: 70 }}
        />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 mx-auto flex flex-col rounded-t-[24px] bg-[var(--admin-surface)] outline-none",
            "max-w-[var(--admin-app-max-width)]",
            className,
          )}
          style={{ maxHeight: `${maxVh}vh`, zIndex: 71 }}
        >
          {handle ? <div className="admin-sheet-handle" /> : null}

          {title || closeButton || trailing ? (
            <div
              className="flex items-center gap-2 px-4 pb-3 pt-3"
              style={{ borderBottom: "1px solid var(--admin-border)" }}
            >
              {closeButton ? (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Fermer"
                  className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--admin-text-muted)] tap-scale hover:bg-[var(--admin-surface-muted)]"
                >
                  <X size={18} />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                {title ? (
                  <Drawer.Title className="text-[16px] font-semibold leading-tight text-[var(--admin-text)] truncate">
                    {title}
                  </Drawer.Title>
                ) : null}
                {description ? (
                  <Drawer.Description className="mt-0.5 text-[12px] text-[var(--admin-text-muted)] truncate">
                    {description}
                  </Drawer.Description>
                ) : null}
              </div>
              {trailing ? <div className="shrink-0">{trailing}</div> : null}
            </div>
          ) : null}

          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-4",
              footer ? "pt-3 pb-3" : "py-4",
            )}
            style={{ paddingBottom: footer ? undefined : "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {children}
          </div>

          {footer ? (
            <div
              className="px-4 pt-3"
              style={{
                borderTop: "1px solid var(--admin-border)",
                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
                background: "var(--admin-surface)",
              }}
            >
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
