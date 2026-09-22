import type { Metadata } from "next";
import { BrandFormPage } from "@/features/catalogue";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E17 — nouvelle marque.
export const metadata: Metadata = { title: "Nouvelle marque" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <BrandFormPage id={null} docId={firstParam(params.doc)} />;
}
