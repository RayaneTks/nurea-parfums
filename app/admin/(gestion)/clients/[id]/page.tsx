import type { Metadata } from "next";
import { CustomerPage } from "@/features/customers";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E14 — Fiche client (06 E14, 07 J10).
export const metadata: Metadata = { title: "Fiche client" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <CustomerPage id={decodeURIComponent(id)} pages={firstParam(query.pages) ?? null} docId={firstParam(query.doc)} />;
}
