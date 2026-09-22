import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/**
 * Squelette générique d'écran (04 §2.1) : grand titre puis une liste. Affiché seulement pendant une
 * navigation vers une page qui n'a pas encore rendu son titre — un écran conforme rend le sien
 * immédiatement et met ses données sous `Block`.
 */
export default function GestionLoading() {
  return (
    <PageScaffold ariaLabel="Chargement">
      {/* Boîte de ligne du titre h1 : 28 px × 1,15 ≈ 32 px. */}
      <span className="flex h-8 items-center" aria-hidden>
        <Skeleton width="45%" height={24} />
      </span>
      <SkeletonList count={4} />
    </PageScaffold>
  );
}
