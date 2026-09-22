import type { Metadata } from "next";
import { parseOrdersParams } from "@/contracts/documents";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { OrdersPage } from "@/features/orders";

// E10 — Commandes (06 E10, 07 J8).
export const metadata: Metadata = { title: "Commandes" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return (
    <OrdersPage
      params={parseOrdersParams({
        vue: firstParam(params.vue),
        filtre: firstParam(params.filtre),
        q: firstParam(params.q),
        pages: firstParam(params.pages),
      })}
      docId={firstParam(params.doc)}
    />
  );
}
