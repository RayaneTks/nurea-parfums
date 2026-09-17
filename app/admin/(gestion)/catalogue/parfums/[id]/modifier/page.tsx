import type { Metadata } from "next";
import { PerfumeFormPage } from "@/features/catalogue";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E19 — modifier un parfum (fiche et tarifs en un enregistrement).
export const metadata: Metadata = { title: "Modifier le parfum" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <PerfumeFormPage mode="edit" id={id} docId={firstParam(query.doc)} />;
}
