import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { ComposerBlock } from "../blocks/ComposerBlock";
import { ComposerSkeleton } from "../blocks/skeletons";
import type { SellParams } from "./params";

/**
 * E11 — Composeur Vendre (06 §3.3). Le titre est rendu tout de suite (pour les lecteurs d'écran : la barre d'onglets
 * et la bascule Vente | Commande disent déjà où l'on est) ; le composeur arrive dans son bloc. `doc` ouvre la fiche
 * document au-dessus (A-3) : « Voir » de la carte de confirmation.
 */
export function SellPage({ params, docId }: { params: SellParams; docId?: string }) {
  return (
    <PageScaffold formScroll ariaLabel="Vendre" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <h1 className="sr-only">Vendre</h1>
      <Block fallback={<ComposerSkeleton />} errorMessage="Vendre indisponible.">
        <ComposerBlock params={params} />
      </Block>
    </PageScaffold>
  );
}
