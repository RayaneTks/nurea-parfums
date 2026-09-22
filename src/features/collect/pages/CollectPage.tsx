import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { ReceivablesBlock } from "../blocks/ReceivablesBlock";
import { ReceivablesSkeleton } from "../blocks/skeletons";

/**
 * E13 — À encaisser (06 E13), rattaché à l'onglet Clients (A-1). Aucun bouton `primary` d'écran : l'action
 * principale est portée par le bouton-montant de chaque document. Filtres (`anciennete`, `q`) lus côté client sous
 * `<Suspense>` (le bloc) ; `doc` ouvre la fiche document au-dessus (A-3).
 */
export function CollectPage({ docId }: { docId?: string }) {
  return (
    <PageScaffold formScroll ariaLabel="À encaisser" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="À encaisser" />
      <Block fallback={<ReceivablesSkeleton />} errorMessage="Créances indisponibles.">
        <ReceivablesBlock />
      </Block>
    </PageScaffold>
  );
}
