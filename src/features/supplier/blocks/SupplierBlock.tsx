import { getSupplierEntry, getSupplierLedger } from "@/server/supplier/queries";
import { SupplierView } from "../components/SupplierView";

/** E22 — le carnet et, sous `?ligne=<id>`, la ligne de S22 : servis ensemble, la sheet ne s'ouvre jamais sur un vide. */
export async function SupplierBlock({ ligneId }: { ligneId?: string }) {
  const [ledger, entry] = await Promise.all([getSupplierLedger(), ligneId ? getSupplierEntry(ligneId) : Promise.resolve(null)]);
  return <SupplierView ledger={ledger} entry={entry} />;
}
