import { BarChartSkeleton } from "@/ui/patterns/BarChart";
import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/**
 * Squelettes de E03 (05 §5.1), aux proportions du contenu : libellé micro et montant `display`, carte de deux
 * rangées de 56 px (Marge nette, Dépenses déduites), bandeau À encaisser.
 */
export function SalesFiguresSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-label="Chargement des chiffres">
      <div className="flex flex-col gap-1">
        <Skeleton width={150} height={12} />
        <Skeleton width={170} height={34} />
      </div>
      <SkeletonList count={2} avatar={false} />
      <SkeletonList count={1} avatar={false} />
    </div>
  );
}

export function SalesChartSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy aria-label="Chargement du graphe">
      <Skeleton width={140} height={13} />
      <BarChartSkeleton />
    </div>
  );
}

/** En-tête de section (28 px) et rangées de 56 px. */
export function PeriodDocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-label="Chargement des documents">
      {[3, 2].map((count, index) => (
        <div key={index} className="flex flex-col gap-1">
          <span className="flex h-[29px] items-center px-1 pb-1">
            <Skeleton width={140} height={15} />
          </span>
          <SkeletonList count={count} avatar={false} />
        </div>
      ))}
    </div>
  );
}
