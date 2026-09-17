import { Block } from "@/app-shell/Block";
import { DocumentSheetFrame } from "../components/DocumentSheetFrame";
import { DocumentSheetSkeleton } from "../components/DocumentSheetStates";
import { DocumentSheetBlock } from "./DocumentSheetBlock";

/**
 * L'emplacement `sheet` de `PageScaffold` (07 §3.0.2 A-3, 05 §3.2) : sur toute page du shell, `?doc=<id>` ouvre la
 * fiche document au-dessus de l'écran courant. Sans `doc`, rien n'est rendu.
 *
 * Mise en œuvre de « `<Block><DocumentSheetBlock id={docId} /></Block>` » : le bloc est rendu DANS le cadre de la
 * sheet, qui reste monté pendant que les données arrivent — la sheet s'ouvre immédiatement sur son squelette et
 * ne rejoue pas son entrée quand la fiche remplace le squelette ; une erreur de chargement s'affiche dans la sheet
 * (« Document indisponible — Réessayer »). Une clé par document : en ouvrir un autre repart d'une fiche neuve.
 */
export function DocumentSheetSlot({ docId }: { docId?: string | null }) {
  if (!docId) return null;
  return (
    <DocumentSheetFrame key={docId}>
      <Block fallback={<DocumentSheetSkeleton />} errorMessage="Document indisponible.">
        <DocumentSheetBlock id={docId} />
      </Block>
    </DocumentSheetFrame>
  );
}
