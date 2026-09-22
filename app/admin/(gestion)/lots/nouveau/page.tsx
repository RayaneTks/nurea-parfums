import type { Metadata } from "next";
import { NewBatchPage } from "@/features/batches";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E21 — Nouveau lot (06 E21, 07 J13).
export const metadata: Metadata = { title: "Nouveau lot" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <NewBatchPage docId={firstParam(params.doc)} />;
}
