import { aEncaisser, aEncaisserDetail, creancesAnciennes } from "@/server/chiffres";
import { activePockets } from "@/server/treasury/queries";
import { ReceivablesView } from "../components/ReceivablesView";

/**
 * E13 — le total (`aEncaisser()`), les créances qu'il somme, leur partie ancienne et les poches du moment : un
 * aller-retour parallèle, les définitions de `src/server/chiffres` (04 §6), jamais recomposées.
 */
export async function ReceivablesBlock() {
  const [total, receivables, old, pockets] = await Promise.all([aEncaisser(), aEncaisserDetail(), creancesAnciennes(), activePockets()]);
  return <ReceivablesView total={total} receivables={receivables} old={old} pockets={pockets} />;
}
