import type { Metadata } from "next";
import { parseStatsParams } from "@/contracts/stats";
import { StatistiquesPage } from "@/features/dashboard";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E07 — Statistiques (06 E07, 07 J14).
export const metadata: Metadata = { title: "Statistiques" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return (
    <StatistiquesPage
      params={parseStatsParams({
        periode: firstParam(params.periode),
        ref: firstParam(params.ref),
        pages: firstParam(params.pages),
      })}
      docId={firstParam(params.doc)}
    />
  );
}
