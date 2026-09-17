import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyActionProps = {
  /** Le ou les boutons ; porte l'UNIQUE `primary` de l'écran. */
  children: ReactNode;
  /**
   * Ligne de résumé au-dessus du bouton : ce que le CTA va écrire, sans le
   * répéter — « Espèces · 70 € resteront à encaisser » (06 E11). Une ligne,
   * tronquée avec ellipse, jamais sur deux.
   */
  summary?: ReactNode;
  /** Fond translucide flouté et filet haut (défaut true). */
  background?: boolean;
  className?: string;
};

/**
 * CTA de page collant, sous le pouce (05 §3.1).
 *
 * - Flotte AU-DESSUS de la tab bar et du clavier : `bottom` = max(tab bar,
 *   inset clavier). Sinon il passe derrière l'une ou l'autre.
 * - Dernier enfant du contenu de `PageScaffold` : collant DANS le flux, il y
 *   occupe sa hauteur — résumé compris — et le dernier élément de la liste ne
 *   passe jamais dessous en fin de défilement.
 */
export function StickyAction({ children, summary, background = true, className }: StickyActionProps) {
  return (
    <div
      data-sticky-action
      className={cn(
        "sticky left-0 right-0 z-[var(--admin-z-sticky-action)] -mx-4 mt-auto px-4 pb-3 pt-3",
        background ? "admin-sticky-bar" : null,
        className,
      )}
      style={{ bottom: "max(var(--admin-tab-bar-height), var(--admin-keyboard-inset, 0px))" }}
    >
      {summary ? (
        <p className="admin-type-caption tnum mb-2 truncate text-center text-[var(--admin-text-muted)]">{summary}</p>
      ) : null}
      {children}
    </div>
  );
}
