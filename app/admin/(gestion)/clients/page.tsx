import type { Metadata } from "next";
import { parseCustomersParams } from "@/contracts/customers";
import { CustomersPage } from "@/features/customers";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E12 — Clients (06 E12, 07 J10).
export const metadata: Metadata = { title: "Clients" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return (
    <CustomersPage
      params={parseCustomersParams({ q: firstParam(params.q), pages: firstParam(params.pages) })}
      docId={firstParam(params.doc)}
    />
  );
}
