import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { PerfumeSheetBlock } from "../blocks/PerfumeSheetBlock";
import { PerfumeSheetSkeleton } from "../blocks/skeletons";
import { parsePerfumeId } from "./params";

/** E16 — Fiche parfum en consultation (06 §3.5). Le retour « Catalogue » est rendu par le shell. */
export function PerfumePage({ id, docId }: { id: string; docId?: string }) {
  const perfumeId = parsePerfumeId(id);
  return (
    <PageScaffold ariaLabel="Fiche parfum" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <Block fallback={<PerfumeSheetSkeleton />} errorMessage="Fiche indisponible.">
        <PerfumeSheetBlock id={perfumeId} />
      </Block>
    </PageScaffold>
  );
}
