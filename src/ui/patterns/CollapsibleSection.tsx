"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "../primitives/Card";
import { Stack } from "../primitives/Stack";

type CollapsibleSectionProps = {
  title: string;
  /** Résumé à droite du titre, section repliée : « Aujourd'hui · Espèces ». */
  summary?: ReactNode;
  /** Ouverte au premier rendu (défaut false). État non persisté. */
  defaultOpen?: boolean;
  /** Sans carte (dans une sheet). */
  bare?: boolean;
  children: ReactNode;
};

/**
 * Repli / dépli des champs facultatifs (« Plus d'options ») : l'écran reste
 * court sans supprimer d'option. Chevron animé en 200 ms, `aria-expanded`.
 */
export function CollapsibleSection({ title, summary, defaultOpen = false, bare = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const content = (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "tap-scale flex min-h-[var(--admin-touch-min)] w-full items-center gap-2 rounded-[var(--admin-radius-md)] text-left",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        )}
      >
        <span className="admin-type-body-em min-w-0 flex-1 text-[var(--admin-text)]">{title}</span>
        {!open && summary ? (
          <span className="admin-type-caption min-w-0 truncate text-[var(--admin-text-muted)]">{summary}</span>
        ) : null}
        <ChevronDown
          size={17}
          aria-hidden
          className={cn(
            "shrink-0 text-[var(--admin-text-subtle)]",
            "[transition-property:transform] [transition-duration:var(--admin-duration-default)] [transition-timing-function:var(--admin-easing-default)] motion-reduce:transition-none",
            open ? "rotate-180" : null,
          )}
        />
      </button>
      <div id={panelId} hidden={!open} className="mt-3">
        <Stack gap={3}>{children}</Stack>
      </div>
    </>
  );

  return bare ? <div>{content}</div> : <Card padding={3}>{content}</Card>;
}
