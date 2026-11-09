import { getSupplierDetail, getSupplierEntry, getSupplierLedger, getSupplierPicker } from "@/server/supplier/queries";
import { openDebtIds } from "../components/detail-model";
import { SupplierView } from "../components/SupplierView";
import { ledgerAllocation } from "../components/supplier-model";

/**
 * E22 — le carnet et, sous `?ligne=<id>`, la ligne de S22, sous `?selection=1` le sélecteur de S25 : servis
 * ensemble, une sheet ne s'ouvre jamais sur un vide. Le détail du reste à payer (S27) suit le carnet : les
 * parfums des dettes qui ont encore un reste, réparties comme l'écran les répartit.
 */
export async function SupplierBlock({ ligneId, selection }: { ligneId?: string; selection?: boolean }) {
  const [ledger, entry, picker] = await Promise.all([
    getSupplierLedger(),
    ligneId ? getSupplierEntry(ligneId) : Promise.resolve(null),
    selection ? getSupplierPicker() : Promise.resolve(null),
  ]);
  const detail = await getSupplierDetail(openDebtIds(ledgerAllocation(ledger.entries)));
  return <SupplierView ledger={ledger} entry={entry} picker={picker} detail={detail} />;
}
