import type { OrdersParams } from "@/contracts/documents";
import { ordersList } from "@/server/documents/queries";
import { activePockets } from "@/server/treasury/queries";
import { OrdersView } from "../components/OrdersView";

/** E10 — la vue demandée (sections, compteurs, chips) et les poches du moment pour S02, en parallèle. */
export async function OrdersBlock({ params }: { params: OrdersParams }) {
  const [data, pockets] = await Promise.all([
    ordersList(params.vue, params.filtre, params.q, String(params.pages)),
    activePockets(),
  ]);
  return <OrdersView data={data} pockets={pockets} />;
}
