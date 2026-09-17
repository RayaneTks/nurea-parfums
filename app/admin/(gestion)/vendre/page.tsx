import type { Metadata } from "next";
import { ROUTE_SPECS } from "@/app-shell/routes";
import { EcranProvisoire } from "../_provisoire/EcranProvisoire";

// PROVISOIRE (07 J4) — E11 composeur Vendre définitif au jalon J9.
export const metadata: Metadata = { title: "Vendre" };

export default function VendrePage() {
  return <EcranProvisoire titre="Vendre" jalon={ROUTE_SPECS.vendre.jalon} />;
}
