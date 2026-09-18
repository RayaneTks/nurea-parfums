import type { Metadata } from "next";
import { BatchPage, parseBatchId } from "@/features/batches";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E06 — Fiche lot (06 E06, 07 J13) ; `?assigner=1` ouvre S13.
export const metadata: Metadata = { title: "Lot" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <BatchPage id={parseBatchId(id)} assigner={firstParam(query.assigner) === "1"} docId={firstParam(query.doc)} />;
}
