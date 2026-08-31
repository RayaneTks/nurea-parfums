import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { listOutstanding } from "@/server/collect/queries";
import { CollectListClient } from "../components/CollectListClient";

export async function CollectPage() {
  const data = await listOutstanding();
  return (
    <PageScaffold padding={4} ariaLabel="À encaisser">
      <CollectListClient initial={data} />
    </PageScaffold>
  );
}
