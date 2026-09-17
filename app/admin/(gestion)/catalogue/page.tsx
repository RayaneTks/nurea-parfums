import type { Metadata } from "next";
import { ROUTE_SPECS } from "@/app-shell/routes";
import { EcranProvisoire } from "../_provisoire/EcranProvisoire";

// PROVISOIRE (07 J4) — E15 Catalogue définitif au jalon J11.
export const metadata: Metadata = { title: "Catalogue" };

export default function CataloguePage() {
  return <EcranProvisoire titre="Catalogue" jalon={ROUTE_SPECS.catalogue.jalon} />;
}
