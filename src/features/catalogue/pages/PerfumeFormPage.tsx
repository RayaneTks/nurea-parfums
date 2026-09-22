import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { PerfumeFormBlock } from "../blocks/PerfumeFormBlock";
import { FormSkeleton } from "../blocks/skeletons";
import { parsePerfumeId } from "./params";

type PerfumeFormPageProps = ({ mode: "create"; dupliquer?: string } | { mode: "edit"; id: string }) & { docId?: string };

/**
 * E19 — Formulaire parfum, en création (`/nouveau`, `?dupliquer=<id>`) ou en modification (`/<id>/modifier`).
 * Le titre s'affiche tout de suite ; le formulaire arrive avec ses données.
 */
export function PerfumeFormPage(props: PerfumeFormPageProps) {
  const title = props.mode === "edit" ? "Modifier le parfum" : props.dupliquer ? "Dupliquer le parfum" : "Nouveau parfum";
  return (
    <PageScaffold formScroll ariaLabel={title} docId={props.docId} sheet={<DocumentSheetSlot docId={props.docId} />}>
      <SectionHeader title={title} />
      <Block fallback={<FormSkeleton sections={3} />} errorMessage="Formulaire indisponible.">
        {props.mode === "edit" ? (
          <PerfumeFormBlock mode="edit" id={parsePerfumeId(props.id)} />
        ) : (
          <PerfumeFormBlock mode="create" duplicateId={props.dupliquer ? parsePerfumeId(props.dupliquer) : null} />
        )}
      </Block>
    </PageScaffold>
  );
}
