import type { Metadata } from "next";
import { parseJourParam } from "@/contracts/stats";
import { JourneePage } from "@/features/dashboard";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E02 — Récap du jour (06 E02, 07 J14).
export const metadata: Metadata = { title: "Récap du jour" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <JourneePage jour={parseJourParam(firstParam(params.jour))} docId={firstParam(params.doc)} />;
}
