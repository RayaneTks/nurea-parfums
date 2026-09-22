import type { Metadata } from "next";
import { PerfumeFormPage } from "@/features/catalogue";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E19 — nouveau parfum ; `?dupliquer=<id>` reprend marque et tarifs.
export const metadata: Metadata = { title: "Nouveau parfum" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <PerfumeFormPage mode="create" dupliquer={firstParam(params.dupliquer)} docId={firstParam(params.doc)} />;
}
