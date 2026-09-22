import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { BatchBlock } from "../blocks/BatchBlock";
import { BatchSkeleton } from "../blocks/skeletons";
import { BatchNotFound } from "../components/BatchNotFound";

/**
 * E06 — Fiche lot (06 E06). Le nom du lot n'est connu qu'après la requête : toute la fiche vit donc
 * dans son bloc, derrière un squelette aux proportions exactes. Le retour vers « Lots » est rendu par
 * le header du shell (`getParentScreen`), jamais par cette page (06 §1.5).
 *
 * `?assigner=1` ouvre S13 avec ses candidats, servis par le MÊME bloc : la sheet ne s'ouvre jamais sur
 * un vide, et ne lance aucune requête (06 S13). `doc` ouvre la fiche document au-dessus (A-3).
 *
 * `formScroll` : la fiche se termine par des champs modifiables en place (arrivée prévue, notes). Sans
 * la réserve basse du clavier, le dernier champ passe dessous dès qu'on le touche — relevé par
 * `npm run test:layout` aux trois largeurs.
 */
export function BatchPage({ id, assigner, docId }: { id: string | null; assigner: boolean; docId?: string }) {
  return (
    <PageScaffold formScroll ariaLabel="Fiche lot" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      {id === null ? (
        <BatchNotFound />
      ) : (
        <Block fallback={<BatchSkeleton />} errorMessage="Lot indisponible.">
          <BatchBlock id={id} assigner={assigner} />
        </Block>
      )}
    </PageScaffold>
  );
}
