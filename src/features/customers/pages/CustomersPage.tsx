import { Block } from "@/app-shell/Block";
import type { CustomersParams } from "@/contracts/customers";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { CustomersBlock } from "../blocks/CustomersBlock";
import { CustomersSkeleton } from "../blocks/skeletons";
import { NewCustomerButton } from "../components/NewCustomerButton";

/**
 * E12 — Clients (06 E12). Titre et « Nouveau » tout de suite ; la liste arrive dans son bloc. `q` et `pages` sont
 * lus par la page et passés au bloc (04 §13.1 règle 3) ; `doc` ouvre la fiche document au-dessus (A-3).
 */
export function CustomersPage({ params, docId }: { params: CustomersParams; docId?: string }) {
  return (
    <PageScaffold formScroll ariaLabel="Clients" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Clients" action={<NewCustomerButton />} />
      <Block fallback={<CustomersSkeleton />} errorMessage="Clients indisponibles.">
        <CustomersBlock params={params} />
      </Block>
    </PageScaffold>
  );
}
