import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { BrandFormBlock } from "../blocks/BrandFormBlock";
import { FormSkeleton } from "../blocks/skeletons";

/** E17 — Formulaire marque, en création (`/nouvelle`) ou en modification (`/<id>/modifier`). */
export function BrandFormPage({ id, docId }: { id: string | null; docId?: string }) {
  const title = id === null ? "Nouvelle marque" : "Modifier la marque";
  return (
    <PageScaffold formScroll ariaLabel={title} docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title={title} />
      <Block fallback={<FormSkeleton sections={4} />} errorMessage="Formulaire indisponible.">
        <BrandFormBlock id={id} />
      </Block>
    </PageScaffold>
  );
}
