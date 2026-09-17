"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ListSectionDisclosureProps = {
  /** Titre (et compteur) du bouton de repli. */
  label: ReactNode;
  /** Reste de la ligne d'en-tête (montant), hors du bouton. */
  aside?: ReactNode;
  below?: ReactNode;
  defaultOpen: boolean;
  titleClass: string;
  children: ReactNode;
};

/** Partie cliente d'une `ListSection` repliable : l'état n'est pas persisté. */
export function ListSectionDisclosure({ label, aside, below, defaultOpen, titleClass, children }: ListSectionDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <>
      <div className="flex flex-col px-1 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "tap-scale admin-hit-target min-w-0 flex-1 gap-2 rounded-[var(--admin-radius-md)] text-left",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
              titleClass,
            )}
          >
            <span className="flex min-w-0 items-baseline gap-1.5">{label}</span>
            <ChevronDown
              size={16}
              aria-hidden
              className={cn(
                "shrink-0 text-[var(--admin-text-subtle)]",
                "[transition-property:transform] [transition-duration:var(--admin-duration-default)] [transition-timing-function:var(--admin-easing-default)] motion-reduce:transition-none",
                open ? "rotate-180" : null,
              )}
            />
          </button>
          {aside}
        </div>
        {below}
      </div>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </>
  );
}
