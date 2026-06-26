"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyActionProps = {
  children: ReactNode;
  /** Si true (defaut), affiche un fond opaque avec backdrop blur. */
  background?: boolean;
  className?: string;
};

/**
 * Conteneur sticky bas-de-page pour CTA principal d'une page.
 *
 * - Flotte AU-DESSUS de la tab bar (fixe, 88px) : `bottom` = max(hauteur tab bar,
 *   inset clavier). Sinon le CTA passe derrière la tab bar / le clavier iOS.
 * - z-20 < tab bar (50) mais positionné plus haut → jamais masqué.
 * - place ce composant en dernier enfant du scroll content.
 */
export function StickyAction({ children, background = true, className }: StickyActionProps) {
  return (
    <div
      data-sticky-action
      className={cn(
        // mt-auto : sur les pages courtes (flex-col), pousse le CTA en bas
        // au lieu de le laisser flotter au milieu sur le contenu.
        "sticky left-0 right-0 z-20 mt-auto -mx-4 px-4 pb-3 pt-3",
        background
          ? "border-t border-[var(--admin-border)] bg-[var(--admin-surface)]/95 backdrop-blur-md"
          : null,
        className,
      )}
      style={{
        bottom: "max(var(--admin-tab-bar-height), var(--admin-keyboard-inset, 0px))",
      }}
    >
      {children}
    </div>
  );
}
