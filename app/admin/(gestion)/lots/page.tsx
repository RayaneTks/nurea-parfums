import type { Metadata } from "next";
import { parseBatchesParams } from "@/contracts/batches";
import { BatchesPage } from "@/features/batches";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E05 — Lots (06 E05, 07 J13).
export const metadata: Metadata = { title: "Lots" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return (
    <BatchesPage
      params={parseBatchesParams({ q: firstParam(params.q), pages: firstParam(params.pages) })}
      docId={firstParam(params.doc)}
    />
  );
}
