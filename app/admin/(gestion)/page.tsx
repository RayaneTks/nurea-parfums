import type { Metadata } from "next";
import { AccueilPage } from "@/features/dashboard";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E01 — Accueil (06 E01, 07 J14). Remplace l'écran provisoire de J4.
export const metadata: Metadata = { title: "Accueil" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <AccueilPage docId={firstParam(params.doc)} />;
}
