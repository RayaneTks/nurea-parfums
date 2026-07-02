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
 * - Clavier fermé : le CTA flotte AU-DESSUS de la tab bar fixe (88px).
 * - Clavier ouvert : le shell se comprime déjà au-dessus du clavier (--admin-vh),
 *   donc le bas de la zone de scroll est PILE au-dessus du clavier. On ne doit PAS
 *   re-décaler le CTA de la hauteur du clavier (sinon il flotte au milieu / disparaît) :
 *   on résorbe la réserve tab bar au fur et à mesure que le clavier monte, jusqu'à 0.
 *   → `bottom = max(0, tab-bar − inset)` : 88px sans clavier, 0 avec clavier.
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
        bottom:
          "max(0px, calc(var(--admin-tab-bar-height) - var(--admin-keyboard-inset, 0px)))",
      }}
    >
      {children}
    </div>
  );
}
