import { openBatches } from "@/server/batches/queries";
import { pickerVersion } from "@/server/catalogue/queries";
import { documentSheet, recentlySold } from "@/server/documents/queries";
import { activePockets } from "@/server/treasury/queries";
import { DocumentSheet } from "../components/DocumentSheet";
import { DocumentMissing } from "../components/DocumentSheetStates";

/**
 * Bloc de la fiche document (06 §1.3, A-3) : la fiche (jamais cachée : on encaisse sur ces montants), les poches
 * du moment (S02, S03, S04), les lots ouverts (S07), « Vendus récemment » et la version du sélecteur (S05 en
 * édition) — en un aller-retour parallèle.
 */
export async function DocumentSheetBlock({ id }: { id: string }) {
  const [doc, pockets, batches, recent, version] = await Promise.all([
    documentSheet(id),
    activePockets(),
    openBatches(),
    recentlySold(),
    pickerVersion(),
  ]);
  if (!doc) return <DocumentMissing />;
  return <DocumentSheet doc={doc} pockets={pockets} batches={batches} recent={recent} pickerVersion={version} />;
}
