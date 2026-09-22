import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { CustomerSheetBlock } from "../blocks/CustomerSheetBlock";
import { CustomerSheetSkeleton } from "../blocks/skeletons";

/**
 * E14 — Fiche client (06 E14). Le retour « Clients » est rendu par le shell ; l'historique ouvre la fiche document
 * au-dessus (`doc`, A-3) ; `pages` : pages d'historique affichées (« Afficher plus »).
 */
export function CustomerPage({ id, pages, docId }: { id: string; pages: string | null; docId?: string }) {
  return (
    <PageScaffold ariaLabel="Fiche client" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <Block fallback={<CustomerSheetSkeleton />} errorMessage="Fiche client indisponible.">
        <CustomerSheetBlock id={id} pages={pages} />
      </Block>
    </PageScaffold>
  );
}
