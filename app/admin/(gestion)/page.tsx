import type { Metadata } from "next";
import { ROUTE_SPECS } from "@/app-shell/routes";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { EcranProvisoire } from "./_provisoire/EcranProvisoire";

// PROVISOIRE (07 J4) — E01 Accueil définitif au jalon J14.
export const metadata: Metadata = { title: "Accueil" };

export default async function AccueilPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <EcranProvisoire titre="Accueil" jalon={ROUTE_SPECS.accueil.jalon} docId={firstParam(params.doc)} />;
}
