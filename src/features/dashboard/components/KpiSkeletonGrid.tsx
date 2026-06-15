import { Card } from "@/ui/primitives/Card";
import { Skeleton } from "@/ui/primitives/Skeleton";

function KpiTileSkeleton({ accent = false }: { accent?: boolean }) {
  return (
    <Card padding={3} tone={accent ? "accent" : "surface"}>
      <Skeleton width="48%" height={11} />
      <Skeleton className="mt-2" width="72%" height={22} />
      <Skeleton className="mt-2" width="40%" height={11} />
    </Card>
  );
}

/** Grille 2×2 calquée sur KpiBlock / KpiTile pour éviter le layout shift au chargement. */
export function KpiSkeletonGrid() {
  return (
    <div
      className="grid grid-cols-2 gap-2"
      aria-busy="true"
      aria-label="Chargement des indicateurs"
    >
      <KpiTileSkeleton accent />
      <KpiTileSkeleton />
      <KpiTileSkeleton />
      <KpiTileSkeleton />
    </div>
  );
}
