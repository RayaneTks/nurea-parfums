import { notFound } from "next/navigation";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { getBatchById } from "@/server/batches/queries";
import { BatchDetailClient } from "../components/BatchDetailClient";

export async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getBatchById(id);
  if (!batch) notFound();

  return (
    <PageScaffold padding={4} ariaLabel="Détail lot">
      <BatchDetailClient initial={batch} />
    </PageScaffold>
  );
}
