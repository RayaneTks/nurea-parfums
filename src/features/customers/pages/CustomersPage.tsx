import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { listCustomers } from "@/server/customers/queries";
import { CustomersListClient } from "../components/CustomersListClient";

export async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const { rows, nextCursor } = await listCustomers({
    q: params.q,
    cursor: params.cursor,
    limit: 100,
  });
  return (
    <PageScaffold padding={4} ariaLabel="Clients">
      <CustomersListClient
        initial={rows}
        initialQuery={params.q ?? ""}
        nextCursor={nextCursor}
      />
    </PageScaffold>
  );
}
