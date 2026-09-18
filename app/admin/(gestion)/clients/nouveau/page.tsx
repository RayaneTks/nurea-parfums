import type { Metadata } from "next";
import { CustomerFormPage } from "@/features/customers";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E20 — nouveau client (06 E20, 07 J10) ; `?nom=` pré-remplit le nom (recherche sans résultat, S17).
export const metadata: Metadata = { title: "Nouveau client" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const nom = (firstParam(params.nom) ?? "").trim().slice(0, 120);
  return <CustomerFormPage mode="create" nom={nom} docId={firstParam(params.doc)} />;
}
