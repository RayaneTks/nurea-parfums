import { Card } from "@/ui/primitives/Card";
import { Skeleton, SkeletonList, SkeletonRow } from "@/ui/primitives/Skeleton";

/**
 * Squelettes des écrans des lots (05 §5.1) : aux proportions EXACTES du contenu final — en-tête de
 * section de 29 px, rangées de 56 px, tuiles à la hauteur réelle de leur texte. Rien ne se déplace à
 * l'arrivée des données : c'est la seule raison d'être d'un squelette.
 */

/** E05 : une section « À rattacher » et les lots ouverts. */
export function BatchesSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement des lots">
      {[2, 3].map((count, index) => (
        <div key={index} className="flex flex-col gap-1">
          <span className="flex h-[29px] items-center px-1 pb-1">
            <Skeleton width={140} height={15} />
          </span>
          <SkeletonList count={count} avatar={index === 0} />
        </div>
      ))}
    </div>
  );
}

/** Une tuile de chiffre : libellé micro (11 px), montant (h2 ou display), aide éventuelle. */
function SkeletonTile({ dominant = false }: { dominant?: boolean }) {
  return (
    <div className="flex flex-col rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
      <span className="flex h-[15px] items-center">
        <Skeleton width="55%" height={10} />
      </span>
      <span className={dominant ? "mt-1 flex h-[38px] items-center" : "mt-1 flex h-[27px] items-center"}>
        <Skeleton width="70%" height={dominant ? 28 : 20} />
      </span>
    </div>
  );
}

/** E06 : en-tête, les cinq tuiles, les deux listes, la carte des notes. */
export function BatchSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du lot">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="flex h-[34px] items-center">
            <Skeleton width={180} height={24} />
          </span>
          <span className="mt-0.5 flex h-[18px] items-center">
            <Skeleton width={150} height={12} />
          </span>
        </div>
        <Skeleton width={44} height={44} className="shrink-0 rounded-[var(--admin-radius-md)]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <SkeletonTile dominant />
        </div>
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </div>

      {[2, 1].map((count, index) => (
        <div key={index} className="flex flex-col gap-1">
          <span className="flex h-[29px] items-center px-1 pb-1">
            <Skeleton width={120} height={15} />
          </span>
          <SkeletonList count={count} avatar={index === 0} />
        </div>
      ))}

      <Card padding={3}>
        <div className="flex flex-col gap-4">
          <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
          <Skeleton height={60} className="rounded-[var(--admin-radius-md)]" />
        </div>
      </Card>
    </div>
  );
}

/** E21 : deux champs et le repli. */
export function NewBatchSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du formulaire">
      <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
      <Card padding={3}>
        <SkeletonRow avatar={false} trailing={false} />
      </Card>
    </div>
  );
}
