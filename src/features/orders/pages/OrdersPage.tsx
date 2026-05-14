import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { listOrders, type OrdersFilter } from "@/server/orders/queries";
import { OrdersListClient } from "../components/OrdersListClient";

function parseFilter(raw: string | undefined): OrdersFilter {
  if (raw === "pending" || raw === "ready" || raw === "delivered") return raw;
  return "all";
}

export async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const data = await listOrders(filter);
  return (
    <PageScaffold padding={4} ariaLabel="Commandes">
      <OrdersListClient initial={data} initialFilter={filter} />
    </PageScaffold>
  );
}
