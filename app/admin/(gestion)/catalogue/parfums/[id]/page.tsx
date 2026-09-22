import type { Metadata } from "next";
import { PerfumePage } from "@/features/catalogue";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E16 — fiche parfum en consultation.
export const metadata: Metadata = { title: "Parfum" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <PerfumePage id={id} docId={firstParam(query.doc)} />;
}
