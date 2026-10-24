import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { SupplierBlock } from "../blocks/SupplierBlock";
import { SupplierSkeleton } from "../blocks/skeletons";

/**
 * E22 — Fournisseur (docs/admin/dettes-fournisseur.md) : le titre tout de suite, le carnet dans son bloc.
 * Le retour « Accueil » est rendu par le shell (06 §1.5). `ligne` ouvre S22 au-dessus, `selection` S25 ; `doc` la fiche
 * d'un document (A-3). `formScroll` : les sheets de saisie lèvent le clavier.
 */
export function SupplierPage({ ligneId, selection, docId }: { ligneId?: string; selection?: boolean; docId?: string }) {
  return (
    <PageScaffold formScroll ariaLabel="Fournisseur" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Fournisseur" />
      <Block fallback={<SupplierSkeleton />} errorMessage="Carnet indisponible.">
        <SupplierBlock ligneId={ligneId} selection={selection} />
      </Block>
    </PageScaffold>
  );
}
