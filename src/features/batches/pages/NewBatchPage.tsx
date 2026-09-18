import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { NewBatchForm } from "../components/NewBatchForm";

/**
 * E21 — Nouveau lot (06 E21). Aucune donnée à attendre : le formulaire est là tout de suite, donc pas
 * de bloc ni de squelette. `formScroll` réserve la place du clavier sous le dernier champ.
 */
export function NewBatchPage({ docId }: { docId?: string }) {
  return (
    <PageScaffold formScroll ariaLabel="Nouveau lot" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Nouveau lot" description="Un envoi fournisseur : ses documents, ses dépenses, sa Marge nette." />
      <NewBatchForm />
    </PageScaffold>
  );
}
