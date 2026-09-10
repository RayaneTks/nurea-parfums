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
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const query = (params.q ?? "").trim();
  const data = await listOrders(filter, query);
  return (
    <PageScaffold padding={4} ariaLabel="Commandes">
      {/*
        `key` sur la recherche ET le filtre : sans elle, React réutilise
        l'instance du client et garde l'état d'ouverture des groupes d'un
        résultat à l'autre, ce qui replie la liste qu'on vient de demander.
      */}
      <OrdersListClient
        key={`${filter}:${query}`}
        initial={data}
        initialFilter={filter}
        initialQuery={query}
      />
    </PageScaffold>
  );
}
