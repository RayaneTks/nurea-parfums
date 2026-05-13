"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyActionProps = {
  children: ReactNode;
  className?: string;
  /** Si true, ajoute un fond opaque (defaut). */
  background?: boolean;
};

/**
 * Conteneur sticky bas-de-page pour CTA majeurs (Enregistrer, Créer, etc.).
 *
 * - Sticky sur le bas du viewport, respecte `env(safe-area-inset-bottom)`.
 * - Ne masque pas la bottom-nav (z-index inférieur, padding-bottom déjà géré par shell).
 * - Sur iOS PWA, le bouton reste accessible au pouce.
 *
 * Place ce composant en dernier enfant du `<main>` de la page.
 */
export function StickyAction({ children, className, background = true }: StickyActionProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 right-0 z-20 -mx-5 px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-3",
        background
          ? "border-t border-neutral-200/70 bg-white/95 backdrop-blur-md"
          : null,
        className,
      )}
    >
      {children}
    </div>
  );
}
