"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Stack } from "@/ui/primitives/Stack";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  title: string;
  /** Résumé affiché à droite du titre quand la section est repliée. */
  summary?: ReactNode;
  /** Ouverte au premier rendu (defaut false). */
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Section de formulaire repliable, pour les champs facultatifs.
 *
 * Sert à garder un écran court par défaut sans supprimer d'option : le chemin
 * rapide reste visible d'un coup d'œil, le reste est à un tap. C'est ce qui
 * remplace le doublon « commande rapide » / « commande complète », où le choix
 * du formulaire était demandé avant même de savoir ce que la commande
 * contenait.
 */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <Card padding={3}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full min-h-[var(--admin-touch-min)] items-center gap-2 text-left tap-scale"
      >
        <span className="min-w-0 flex-1 text-[14px] font-semibold text-[var(--admin-text)]">
          {title}
        </span>
        {!open && summary ? (
          <span className="min-w-0 truncate text-[12px] text-[var(--admin-text-subtle)]">
            {summary}
          </span>
        ) : null}
        <ChevronDown
          size={17}
          aria-hidden
          className={cn(
            "shrink-0 text-[var(--admin-text-subtle)]",
            "transition-transform duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
            open ? "rotate-180" : null,
          )}
        />
      </button>
      {open ? (
        <div id={panelId} className="mt-3">
          <Stack gap={2}>{children}</Stack>
        </div>
      ) : null}
    </Card>
  );
}
