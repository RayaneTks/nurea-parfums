import { Card } from "@/ui/primitives/Card";
import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/**
 * Squelettes des écrans clients (05 §5.1) : les proportions du contenu final — rangée « À encaisser » de 56 px,
 * champ de 44 px, sections A–Z ; en-tête, contacts de 64 px et tuiles de la fiche ; champs du formulaire.
 */

export function CustomersSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement des clients">
      <SkeletonList count={1} avatar={false} />
      <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
      <span className="flex h-[18px] items-center px-1">
        <Skeleton width={70} height={12} />
      </span>
      {[3, 2].map((count, index) => (
        <div key={index} className="flex flex-col gap-1">
          <span className="flex h-[29px] items-center px-1 pb-1">
            <Skeleton width={16} height={15} />
          </span>
          <SkeletonList count={count} />
        </div>
      ))}
    </div>
  );
}

export function CustomerSheetSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement de la fiche client">
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" width={56} height={56} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton width="60%" height={24} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} shape="block" height={64} className="flex-1 rounded-[var(--admin-radius-lg)]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2].map((index) => (
          <Card key={index} padding={3} className={index === 0 ? "col-span-2" : undefined}>
            <div className="flex flex-col gap-2">
              <Skeleton width="40%" height={11} />
              <Skeleton width="30%" height={22} />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton shape="block" height={44} className="rounded-[var(--admin-radius-md)]" />
        <Skeleton shape="block" height={44} className="rounded-[var(--admin-radius-md)]" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="flex h-[29px] items-center px-1 pb-1">
          <Skeleton width={90} height={15} />
        </span>
        <SkeletonList count={3} avatar={false} />
      </div>
    </div>
  );
}

export function CustomerFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du formulaire">
      {[4, 2].map((fields, index) => (
        <Card key={index} padding={4}>
          <div className="flex flex-col gap-3">
            <Skeleton width="35%" height={16} />
            {Array.from({ length: fields }, (_, field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <Skeleton width="25%" height={12} />
                <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
