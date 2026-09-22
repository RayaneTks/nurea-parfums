import { Suspense } from "react";
import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { CatalogueBlock } from "../blocks/CatalogueBlock";
import { CatalogueSkeleton } from "../blocks/skeletons";
import { CatalogueHeader, CatalogueHeaderFallback } from "../components/CatalogueHeader";

/**
 * E15 — Catalogue (06 §3.5) : titre, onglets et recherche épinglés tout de suite ; les listes arrivent
 * dans leur bloc. Les paramètres d'URL (`tab`, `q`, `stock`, `visibilite`, `gamme`) sont lus côté client
 * par `useUrlState`, sous `<Suspense>` (04 §3.7) : la liste se filtre sur l'instantané, sans aller-retour. `doc`
 * ouvre la fiche document au-dessus (A-3).
 */
export function CataloguePage({ docId }: { docId?: string }) {
  return (
    <PageScaffold
      docId={docId}
      sheet={<DocumentSheetSlot docId={docId} />}
      header={
        <Suspense fallback={<CatalogueHeaderFallback />}>
          <CatalogueHeader />
        </Suspense>
      }
    >
      <Block fallback={<CatalogueSkeleton />} errorMessage="Catalogue indisponible.">
        <CatalogueBlock />
      </Block>
    </PageScaffold>
  );
}
