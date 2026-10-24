import type { Metadata } from "next";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { SupplierPage } from "@/features/supplier";

// E22 — Fournisseur (06 E22, docs/admin/dettes-fournisseur.md).
export const metadata: Metadata = { title: "Fournisseur" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return (
    <SupplierPage ligneId={firstParam(params.ligne)} selection={firstParam(params.selection) === "1"} docId={firstParam(params.doc)} />
  );
}
