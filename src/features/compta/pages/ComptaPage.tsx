import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { listSalesGroupedByCustomer } from "@/server/sales/queries";
import { treasurySummary, listMovements } from "@/server/treasury/queries";
import { ComptaWithTreasury } from "../components/ComptaWithTreasury";

type ComptaPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export async function ComptaPage({ searchParams }: ComptaPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const [data, treasury, movements] = await Promise.all([
    listSalesGroupedByCustomer({ q: query }),
    treasurySummary(),
    listMovements({ limit: 30 }),
  ]);

  return (
    <PageScaffold padding={4} ariaLabel="Compta">
      <ComptaWithTreasury
        sales={data}
        initialQuery={query}
        treasury={treasury}
        movements={movements}
      />
    </PageScaffold>
  );
}
