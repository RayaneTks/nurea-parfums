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
        Pas de `key` sur la recherche : elle remonterait le composant à chaque
        réponse du serveur, donc démonterait le champ de saisie et lui ferait
        perdre le focus — on tape une lettre, le clavier se referme. Les
        groupes sont sans état, la donnée arrive par les props : rien à
        réinitialiser.
      */}
      <OrdersListClient initial={data} initialFilter={filter} initialQuery={query} />
    </PageScaffold>
  );
}
