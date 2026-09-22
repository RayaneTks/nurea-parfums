import type { BatchesParams } from "@/contracts/batches";
import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { BatchesBlock } from "../blocks/BatchesBlock";
import { BatchesSkeleton } from "../blocks/skeletons";
import { NewBatchButton } from "../components/NewBatchButton";

/**
 * E05 — Lots (06 E05). Le titre et « Nouveau lot » s'affichent tout de suite ; « À rattacher » et les
 * lots arrivent dans leur bloc.
 *
 * Ordre à l'écran : le titre de l'écran (son action de création comprise), puis « À rattacher », puis
 * les lots. 06 place la zone 0 avant l'en-tête « Lots » ; la garder au-dessus du TITRE de l'écran
 * laisserait une liste sans nom en haut de page et retarderait le titre (05 §5.1). « À rattacher »
 * reste au-dessus des LOTS, ce qui est le but de l'écart du 17/09/2026.
 *
 * `q` et `pages` (recherche et pagination de la zone 0) sont lus par la page et passés au bloc
 * (04 §13.1 règle 3) ; `doc` ouvre la fiche document au-dessus (A-3).
 */
export function BatchesPage({ params, docId }: { params: BatchesParams; docId?: string }) {
  return (
    <PageScaffold ariaLabel="Lots" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Lots" action={<NewBatchButton />} />
      <Block fallback={<BatchesSkeleton />} errorMessage="Lots indisponibles.">
        <BatchesBlock params={params} />
      </Block>
    </PageScaffold>
  );
}
