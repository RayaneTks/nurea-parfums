import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/**
 * Squelette de E10 (05 §5.1) : segments (52 px), puis sections — en-tête de 28 px et rangées de 56 px — aux
 * proportions de la liste réelle.
 */
export function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-label="Chargement des commandes">
      <Skeleton height={52} className="rounded-[var(--admin-radius-md)]" />
      {[3, 2].map((count, index) => (
        <div key={index} className="flex flex-col gap-1">
          <span className="flex h-[29px] items-center px-1 pb-1">
            <Skeleton width={120} height={15} />
          </span>
          <SkeletonList count={count} />
        </div>
      ))}
    </div>
  );
}
