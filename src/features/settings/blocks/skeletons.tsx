import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/** En-tête de section : la même hauteur que celle de `ListSection` (05 §5.1, proportions exactes). */
function SectionHead({ width }: { width: number }) {
  return (
    <span className="flex h-[29px] items-center px-1 pb-1">
      <Skeleton width={width} height={15} />
    </span>
  );
}

/**
 * Squelette de E08 (06 E08 : « squelettes de rangées ») — cinq sections aux proportions du contenu :
 * une rangée (poche), un champ (taux), une rangée (ordre), deux rangées (application), deux rangées
 * (compte).
 */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="Chargement des réglages">
      <div className="flex flex-col gap-1">
        <SectionHead width={110} />
        <SkeletonList count={1} avatar={false} />
      </div>
      <Skeleton height={104} className="rounded-[var(--admin-radius-lg)]" />
      <div className="flex flex-col gap-1">
        <SectionHead width={70} />
        <SkeletonList count={1} avatar={false} />
      </div>
      <div className="flex flex-col gap-1">
        <SectionHead width={95} />
        <SkeletonList count={2} avatar={false} />
      </div>
      <div className="flex flex-col gap-1">
        <SectionHead width={70} />
        <SkeletonList count={2} avatar={false} />
      </div>
    </div>
  );
}
