import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { CustomerFormBlock } from "../blocks/CustomerFormBlock";
import { CustomerFormSkeleton } from "../blocks/skeletons";

type CustomerFormPageProps = ({ mode: "create"; nom: string } | { mode: "edit"; id: string }) & { docId?: string };

/**
 * E20 — Formulaire client, en création (`/nouveau`, `?nom=` pré-remplit le nom) ou en modification
 * (`/<id>/modifier`). Le titre s'affiche tout de suite ; le formulaire arrive avec ses données.
 */
export function CustomerFormPage(props: CustomerFormPageProps) {
  const title = props.mode === "edit" ? "Modifier la fiche" : "Nouveau client";
  return (
    <PageScaffold formScroll ariaLabel={title} docId={props.docId} sheet={<DocumentSheetSlot docId={props.docId} />}>
      <SectionHeader title={title} />
      <Block fallback={<CustomerFormSkeleton />} errorMessage="Formulaire indisponible.">
        {props.mode === "edit" ? <CustomerFormBlock mode="edit" id={props.id} /> : <CustomerFormBlock mode="create" nom={props.nom} />}
      </Block>
    </PageScaffold>
  );
}
