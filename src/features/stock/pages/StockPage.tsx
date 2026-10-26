import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { StockBlock } from "../blocks/StockBlock";

/**
 * E23 — En stock (docs/admin/desistements.md) : le titre tout de suite, les flacons dans leur bloc. Le retour
 * « Catalogue » est rendu par le shell ; `doc` ouvre la fiche de la commande d'origine.
 */
export function StockPage({ docId }: { docId?: string }) {
  return (
    <PageScaffold ariaLabel="En stock" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="En stock" />
      <Block fallback={<Skeleton className="h-40 w-full" />} errorMessage="Stock indisponible.">
        <StockBlock />
      </Block>
    </PageScaffold>
  );
}
