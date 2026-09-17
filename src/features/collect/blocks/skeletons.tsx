import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/** Squelette de E13 (05 §5.1) : montant `display`, légende, puis groupes d'en-tête sur deux lignes et rangées. */
export function ReceivablesSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement des créances">
      <div className="flex flex-col gap-1">
        <Skeleton width={140} height={34} />
        <Skeleton width={160} height={13} />
      </div>
      {[2, 1].map((count, index) => (
        <div key={index} className="flex flex-col gap-1">
          <div className="flex flex-col gap-1 px-1 pb-1">
            <span className="flex h-[28px] items-center justify-between">
              <Skeleton width={120} height={15} />
              <Skeleton width={60} height={15} />
            </span>
            <span className="flex h-[44px] items-center">
              <Skeleton width={80} height={12} />
            </span>
          </div>
          <SkeletonList count={count} avatar={false} />
        </div>
      ))}
    </div>
  );
}
