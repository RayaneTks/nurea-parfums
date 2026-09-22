import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageScaffoldProps = {
  /** En-tête collant : titre, segmented, recherche. */
  header?: ReactNode;
  /** Pied hors flux collant. Pour l'action principale, préférer `StickyAction` en dernier enfant. */
  footer?: ReactNode;
  /** Padding latéral (défaut 4 = 16 px). `0` pour une liste bord à bord. */
  padding?: 0 | 3 | 4 | 5;
  ariaLabel?: string;
  /** Formulaire : la réserve basse inclut l'inset clavier. */
  formScroll?: boolean;
  /**
   * Identifiant du document dont la fiche est ouverte (`?doc=<id>`, amendement
   * A-3 de 07). Chaque page le lit dans ses `searchParams` et le transmet ;
   * exposé en `data-doc-id` sur `<main>`.
   */
  docId?: string;
  /**
   * Emplacement rendu en FIN de page, dans `<main>` : le bloc de la fiche
   * document (`<Block><DocumentSheetBlock id={docId} /></Block>`, jalon J8).
   * Un emplacement plutôt qu'un import : `src/ui` ne dépend ni de
   * `src/app-shell` ni de `src/features` (04 §1.3).
   */
  sheet?: ReactNode;
  children: ReactNode;
  className?: string;
};

const pxClass = { 0: "px-0", 3: "px-3", 4: "px-4", 5: "px-5" } as const;

/**
 * LE layout de toute page (05 §3.2) : `#main-content`, réserve basse sous la
 * tab bar, calculs clavier. Une page ne refait jamais ces calculs — les refaire
 * à la main, c'est les refaire faux. Un seul bloc de page dans la zone de
 * défilement : tout le reste passe par ses emplacements.
 */
export function PageScaffold({
  header,
  footer,
  padding = 4,
  ariaLabel,
  formScroll = false,
  docId,
  sheet,
  children,
  className,
}: PageScaffoldProps) {
  return (
    <main
      id="main-content"
      aria-label={ariaLabel}
      data-doc-id={docId}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      {header ? (
        <div className="admin-header-blur admin-safe-top sticky top-0 z-[var(--admin-z-page-header)]">{header}</div>
      ) : null}

      <div
        className={cn(
          "flex flex-1 flex-col gap-4 pt-3",
          pxClass[padding],
          footer ? null : formScroll ? "admin-form-scroll-pad" : "admin-page-bottom-pad",
        )}
      >
        {children}
      </div>

      {footer ? <div className={cn("admin-page-bottom-pad shrink-0", pxClass[padding])}>{footer}</div> : null}

      {sheet}
    </main>
  );
}
