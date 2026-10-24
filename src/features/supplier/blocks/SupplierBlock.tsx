import { getSupplierEntry, getSupplierLedger, getSupplierPicker } from "@/server/supplier/queries";
import { SupplierView } from "../components/SupplierView";

/**
 * E22 — le carnet et, sous `?ligne=<id>`, la ligne de S22, sous `?selection=1` le sélecteur de S25 : servis
 * ensemble, une sheet ne s'ouvre jamais sur un vide.
 */
export async function SupplierBlock({ ligneId, selection }: { ligneId?: string; selection?: boolean }) {
  const [ledger, entry, picker] = await Promise.all([
    getSupplierLedger(),
    ligneId ? getSupplierEntry(ligneId) : Promise.resolve(null),
    selection ? getSupplierPicker() : Promise.resolve(null),
  ]);
  return <SupplierView ledger={ledger} entry={entry} picker={picker} />;
}
