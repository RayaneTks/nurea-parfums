import type { Metadata } from "next";
import { ROUTE_SPECS } from "@/app-shell/routes";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { EcranProvisoire } from "../_provisoire/EcranProvisoire";

// PROVISOIRE (07 J4) — E11 composeur Vendre définitif au jalon J9.
export const metadata: Metadata = { title: "Vendre" };

export default async function VendrePage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <EcranProvisoire titre="Vendre" jalon={ROUTE_SPECS.vendre.jalon} docId={firstParam(params.doc)} />;
}
