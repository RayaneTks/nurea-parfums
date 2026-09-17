import type { Metadata } from "next";
import { ROUTE_SPECS } from "@/app-shell/routes";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { EcranProvisoire } from "../_provisoire/EcranProvisoire";

// PROVISOIRE (07 J4) — E12 Clients définitif au jalon J10.
export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <EcranProvisoire titre="Clients" jalon={ROUTE_SPECS.clients.jalon} docId={firstParam(params.doc)} />;
}
