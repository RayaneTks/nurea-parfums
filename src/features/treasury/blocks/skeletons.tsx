import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/** Squelette de E03 vue Trésorerie (05 §5.1) : montant `display`, poches, bouton, journal. */
export function TreasurySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement de la Trésorerie">
      <div className="flex flex-col gap-1">
        <Skeleton width={90} height={12} />
        <Skeleton width={170} height={34} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="flex h-[29px] items-center px-1 pb-1">
          <Skeleton width={90} height={15} />
        </span>
        <SkeletonList count={4} />
      </div>
      <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
      <div className="flex flex-col gap-1">
        <span className="flex h-[29px] items-center px-1 pb-1">
          <Skeleton width={160} height={15} />
        </span>
        <SkeletonList count={3} avatar={false} />
      </div>
    </div>
  );
}

/** Squelette de E04 : chips de poche, net du mois, un jour de mouvements. */
export function JournalSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du journal">
      <div className="flex gap-2">
        {[64, 80, 72].map((width, index) => (
          <Skeleton key={index} width={width} height={44} className="rounded-[var(--admin-radius-md)]" />
        ))}
      </div>
      <span className="flex h-[32px] items-center justify-between">
        <Skeleton width={100} height={15} />
        <Skeleton width={110} height={24} />
      </span>
      <div className="flex flex-col gap-1">
        <span className="flex h-[29px] items-center px-1 pb-1">
          <Skeleton width={140} height={15} />
        </span>
        <SkeletonList count={4} avatar={false} />
      </div>
    </div>
  );
}
