import { Skeleton } from "@/ui/primitives/Skeleton";
import { RecentlySoldSkeleton } from "../components/RecentlySold";

/**
 * Squelette de E11 (05 §5.1) aux proportions du composeur vide : en-tête Vente | Commande (44 px de contrôle), grille
 * « Vendus récemment » de 8 tuiles, champ « Rechercher un parfum » (44 px).
 */
export function ComposerSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du composeur">
      <div className="-mx-4 -mt-3 px-4 pb-2 pt-3">
        <Skeleton height={52} className="rounded-[var(--admin-radius-md)]" />
      </div>
      <div className="flex flex-col gap-3">
        <RecentlySoldSkeleton />
        <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
      </div>
    </div>
  );
}
