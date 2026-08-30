import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";
import { PageScaffold } from "@/ui/patterns/PageScaffold";

/**
 * Squelette affiché pendant la navigation entre routes `/admin/*`.
 *
 * Reprend la structure de tout écran de l'app — titre puis liste — pour que la
 * transition n'ait pas l'air d'un changement de gabarit.
 */
export default function AdminLoading() {
  return (
    <PageScaffold padding={4} ariaLabel="Chargement">
      <div aria-busy="true" className="space-y-4">
        <div className="space-y-2">
          <Skeleton width="55%" height={28} />
          <Skeleton width="35%" height={13} />
        </div>
        <SkeletonList count={6} />
      </div>
    </PageScaffold>
  );
}
