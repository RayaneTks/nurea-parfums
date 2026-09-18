import type { Metadata } from "next";
import { parseJournalMonth } from "@/contracts/compta";
import { isRecordId } from "@/contracts/treasury";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { JournalPage } from "@/features/treasury";

// E04 — Journal (06 E04, 07 A-2 et J12).
export const metadata: Metadata = { title: "Journal" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const poche = firstParam(params.poche);
  return <JournalPage month={parseJournalMonth(firstParam(params.mois))} pocketId={poche && isRecordId(poche) ? poche : null} docId={firstParam(params.doc)} />;
}
