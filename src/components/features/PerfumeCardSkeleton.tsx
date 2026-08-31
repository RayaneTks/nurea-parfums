import type { FC } from "react";

/**
 * Attente de la grille du catalogue.
 *
 * Elle reprend exactement la structure de `PerfumeCard` — carré, filet,
 * trois lignes de texte — pour que rien ne se déplace à l'arrivée des données.
 */
const PerfumeCardSkeleton: FC = () => (
  <div className="border border-nurea-border bg-nurea-surface">
    <div className="aspect-square w-full bg-nurea-surface-hover" />
    <div className="space-y-3 border-t border-nurea-border p-5">
      <div className="h-3 w-1/3 bg-nurea-surface-hover" />
      <div className="h-5 w-2/3 bg-nurea-surface-hover" />
    </div>
  </div>
);

export const CatalogSkeleton: FC = () => (
  <div className="nurea-page py-18" aria-busy="true" aria-label="Chargement du catalogue">
    <div className="nurea-catalogue-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <PerfumeCardSkeleton key={index} />
      ))}
    </div>
  </div>
);
