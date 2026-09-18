import type { BatchesParams } from "@/contracts/batches";
import { batchesList, openBatches } from "@/server/batches/queries";
import { BatchesView } from "../components/BatchesView";

/**
 * E05 — la liste des lots avec leurs chiffres, la zone « À rattacher », et les lots OUVERTS du moment
 * pour le sélecteur S07 de cette zone. Les deux requêtes partent en parallèle (04 §13.1 règle 2).
 */
export async function BatchesBlock({ params }: { params: BatchesParams }) {
  const [data, open] = await Promise.all([batchesList(params.q, String(params.pages)), openBatches()]);
  return <BatchesView data={data} openBatches={open} />;
}
