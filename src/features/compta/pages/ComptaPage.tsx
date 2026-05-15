import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { listSalesGroupedByCustomer } from "@/server/sales/queries";
import { ComptaListClient } from "../components/ComptaListClient";

type ComptaPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export async function ComptaPage({ searchParams }: ComptaPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const data = await listSalesGroupedByCustomer({ q: query });

  return (
    <PageScaffold padding={4} ariaLabel="Compta">
      <ComptaListClient initial={data} initialQuery={query} />
    </PageScaffold>
  );
}
