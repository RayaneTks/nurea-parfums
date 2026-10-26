import type { Metadata } from "next";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { StockPage } from "@/features/stock";

// E23 — En stock (docs/admin/desistements.md).
export const metadata: Metadata = { title: "En stock" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <StockPage docId={firstParam(params.doc)} />;
}
