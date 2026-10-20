import type { FC } from "react";

/**
 * Attente d'une carte : même boîte que `PerfumeCard` (visuel 2:3, marque, nom), pour que rien ne
 * bouge à l'arrivée des données. Pulsation d'opacité seulement, coupée en mouvement réduit.
 */
export const PerfumeCardSkeleton: FC = () => (
  <div aria-hidden className="flex flex-col rounded-lg bg-surface-1 p-2 motion-safe:animate-pulse">
    <div className="aspect-[2/3] rounded-md bg-surface-2" />
    <div className="flex flex-col gap-2 px-2 pb-2 pt-3">
      <div className="h-4 w-1/2 rounded-sm bg-surface-2" />
      <div className="h-5 w-3/4 rounded-sm bg-surface-2" />
    </div>
  </div>
);

/** Grille d'attente du catalogue (colonnes du § B.5 ; la vraie grille arrive en T9). */
export const CatalogSkeleton: FC = () => (
  <div className="page-x py-12" role="status" aria-label="Chargement du catalogue">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <PerfumeCardSkeleton key={index} />
      ))}
    </div>
  </div>
);
