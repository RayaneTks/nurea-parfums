import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { SettingsBlock } from "../blocks/SettingsBlock";
import { SettingsSkeleton } from "../blocks/skeletons";

/**
 * E08 — Réglages (06 E08) : le titre tout de suite, les rangées dans leur bloc streamé. Aucune action
 * principale (chaque réglage s'enregistre au changement) ; le retour « Accueil » est rendu par le shell
 * (06 §1.5). `doc` ouvre la fiche d'un document au-dessus, comme sur toute page du shell (A-3).
 * L'emplacement « Notifications » (N10) n'existe pas en v1.
 */
export function SettingsPage({ docId }: { docId?: string }) {
  return (
    <PageScaffold ariaLabel="Réglages" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Réglages" />
      <Block fallback={<SettingsSkeleton />} errorMessage="Réglages indisponibles.">
        <SettingsBlock />
      </Block>
    </PageScaffold>
  );
}
