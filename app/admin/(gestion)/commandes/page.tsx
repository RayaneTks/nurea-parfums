import type { Metadata } from "next";
import { ROUTE_SPECS } from "@/app-shell/routes";
import { EcranProvisoire } from "../_provisoire/EcranProvisoire";

// PROVISOIRE (07 J4) — E10 Commandes définitif au jalon J8.
export const metadata: Metadata = { title: "Commandes" };

export default function CommandesPage() {
  return <EcranProvisoire titre="Commandes" jalon={ROUTE_SPECS.commandes.jalon} />;
}
