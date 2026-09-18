import type { Metadata } from "next";
import { CustomerFormPage } from "@/features/customers";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E20 — modifier une fiche client (06 E20, 07 J10).
export const metadata: Metadata = { title: "Modifier la fiche" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <CustomerFormPage mode="edit" id={decodeURIComponent(id)} docId={firstParam(query.doc)} />;
}
