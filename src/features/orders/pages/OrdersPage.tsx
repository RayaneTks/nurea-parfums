import { Block } from "@/app-shell/Block";
import type { OrdersParams } from "@/contracts/documents";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { OrdersBlock } from "../blocks/OrdersBlock";
import { OrdersSkeleton } from "../blocks/skeletons";
import { NewOrderButton } from "../components/NewOrderButton";

/**
 * E10 — Commandes (06 E10). Titre et « Nouvelle commande » tout de suite ; la liste arrive dans son bloc. Les
 * paramètres (`vue`, `filtre`, `q`, `pages`) sont lus par la page et passés au bloc (04 §13.1 règle 3) ; `doc` ouvre
 * la fiche document au-dessus (A-3).
 */
export function OrdersPage({ params, docId }: { params: OrdersParams; docId?: string }) {
  return (
    <PageScaffold formScroll ariaLabel="Commandes" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Commandes" action={<NewOrderButton />} />
      <Block fallback={<OrdersSkeleton />} errorMessage="Commandes indisponibles.">
        <OrdersBlock params={params} />
      </Block>
    </PageScaffold>
  );
}
