import type { Metadata } from "next";
import { CataloguePage } from "@/features/catalogue";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E15 — les filtres (`tab`, `q`, `stock`, `visibilite`, `gamme`) sont lus côté client, sous Suspense ; `doc` ici (A-3).
export const metadata: Metadata = { title: "Catalogue" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <CataloguePage docId={firstParam(params.doc)} />;
}
