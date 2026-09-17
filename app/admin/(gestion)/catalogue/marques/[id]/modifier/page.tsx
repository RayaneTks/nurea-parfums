import type { Metadata } from "next";
import { BrandFormPage } from "@/features/catalogue";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E17 — modifier une marque.
export const metadata: Metadata = { title: "Modifier la marque" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <BrandFormPage id={decodeURIComponent(id)} docId={firstParam(query.doc)} />;
}
