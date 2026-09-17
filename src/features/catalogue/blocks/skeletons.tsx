import { Card } from "@/ui/primitives/Card";
import { Skeleton, SkeletonList, SkeletonRow } from "@/ui/primitives/Skeleton";

/**
 * Squelettes des blocs du catalogue (05 §5.1) : les proportions du contenu final — titre de section et
 * bouton de 44 px, rangées de 56 px, vignettes 9:16 — pour que rien ne bouge à l'arrivée des données.
 */

function SectionHeaderSkeleton() {
  return (
    <div className="flex items-end justify-between gap-3" aria-hidden>
      {/* Boîte de ligne d'un h2 : 20 px × 1,25. */}
      <span className="flex h-[25px] w-1/3 items-center">
        <Skeleton height={18} />
      </span>
      <Skeleton width={96} height={44} className="rounded-[var(--admin-radius-md)]" />
    </div>
  );
}

export function CatalogueSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-label="Chargement du catalogue">
      <SectionHeaderSkeleton />
      <SkeletonList count={8} avatar={false} />
    </div>
  );
}

export function PerfumeSheetSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du parfum">
      <div className="flex gap-4">
        <Skeleton shape="block" width={112} height={168} className="rounded-[var(--admin-radius-lg)]" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton width="80%" height={28} />
          <Skeleton width="45%" height={18} />
        </div>
      </div>
      <Card padding={3}>
        <SkeletonRow avatar={false} trailing />
      </Card>
      <SkeletonList count={2} avatar={false} />
      <SkeletonList count={1} avatar={false} />
      <Card padding={4}>
        <div className="flex flex-col gap-3">
          <Skeleton width="40%" height={16} />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} shape="block" className="aspect-[9/16] rounded-[var(--admin-radius-md)]" height="auto" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement du formulaire">
      {Array.from({ length: sections }, (_, index) => (
        <Card key={index} padding={4}>
          <div className="flex flex-col gap-3">
            <Skeleton width="35%" height={16} />
            <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
            <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
          </div>
        </Card>
      ))}
    </div>
  );
}
