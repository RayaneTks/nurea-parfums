import type { CustomersParams } from "@/contracts/customers";
import { aEncaisser, aEncaisserDetail } from "@/server/chiffres";
import { customersList } from "@/server/customers/queries";
import { CustomersView } from "../components/CustomersView";

/**
 * E12 — la fenêtre de la liste demandée, et la rangée « À encaisser » : le total et les documents qu'il somme, par
 * les fonctions de l'écran À encaisser (04 §6) — le même chiffre aux deux endroits. Un aller-retour parallèle.
 */
export async function CustomersBlock({ params }: { params: CustomersParams }) {
  const [data, total, receivables] = await Promise.all([
    customersList(params.q, String(params.pages)),
    aEncaisser(),
    aEncaisserDetail(),
  ]);
  return <CustomersView data={data} receivableTotal={total} receivableCount={receivables.length} />;
}
