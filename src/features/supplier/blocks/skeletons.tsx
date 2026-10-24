import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";

/** Squelette de E22 : la carte du Reste à payer (montant, euros, taux, deux boutons) puis le carnet. */
export function SupplierSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="Chargement du carnet fournisseur">
      <Skeleton height={248} className="rounded-[var(--admin-radius-lg)]" />
      <SkeletonList count={4} avatar={false} />
    </div>
  );
}
