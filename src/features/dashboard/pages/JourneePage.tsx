import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { DayRecapBlock } from "../blocks/DayBlocks";
import { DayRecapSkeleton } from "../blocks/skeletons";

/**
 * E02 — Récap du jour (06 E02). Le bilan d'une journée, à partager. Le navigateur de date fait partie du
 * bloc : son libellé vient du jour lu en base (jamais d'une horloge de navigateur, qui donnerait un autre
 * texte au rendu serveur et ferait échouer l'hydratation).
 *
 * Le titre de l'écran EST la date : le header du shell porte déjà le retour « Accueil » (06 §1.5), et une
 * page ne rend jamais son propre lien retour.
 */
export function JourneePage({ jour, docId }: { jour: string; docId?: string }) {
  return (
    <PageScaffold ariaLabel="Récap du jour" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <Block fallback={<DayRecapSkeleton />} errorMessage="Récap indisponible.">
        <DayRecapBlock jour={jour} />
      </Block>
    </PageScaffold>
  );
}
