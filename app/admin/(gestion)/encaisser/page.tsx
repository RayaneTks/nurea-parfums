import type { Metadata } from "next";
import { CollectPage } from "@/features/collect";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E13 — À encaisser (06 E13, 07 J8).
export const metadata: Metadata = { title: "À encaisser" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <CollectPage docId={firstParam(params.doc)} />;
}
