import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { listSalesGroupedByCustomer, type Period } from "@/server/sales/queries";
import { ComptaListClient } from "../components/ComptaListClient";

type ComptaPageProps = {
  searchParams: Promise<{ period?: string; q?: string }>;
};

function parsePeriod(raw: string | undefined): Period {
  if (raw === "week" || raw === "all") return raw;
  return "month";
}

export async function ComptaPage({ searchParams }: ComptaPageProps) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const query = (params.q ?? "").trim();
  const data = await listSalesGroupedByCustomer({ period, q: query });

  return (
    <PageScaffold padding={4} ariaLabel="Compta">
      <ComptaListClient initial={data} initialPeriod={period} initialQuery={query} />
    </PageScaffold>
  );
}
