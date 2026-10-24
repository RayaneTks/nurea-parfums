import { Truck } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { dzdFromDb } from "@/domain/money";
import { getSupplierBalance } from "@/server/supplier/queries";
import { Card } from "@/ui/primitives/Card";
import { ListRow } from "@/ui/primitives/ListRow";
import { balanceHeadline } from "../components/supplier-model";

/**
 * Rangée « Fournisseur » de l'Accueil : le Reste à payer, lu par la même fonction que l'en-tête de E22
 * (les deux disent toujours le même montant).
 */
export async function SupplierHomeRow() {
  const balance = await getSupplierBalance();
  const headline = balanceHeadline(dzdFromDb(balance.remainingDzd));
  return (
    <Card padding={0}>
      <ListRow
        href={routes.fournisseur()}
        primary="Fournisseur"
        secondary={headline.state === "due" ? `Reste à payer ${headline.amount}` : headline.amount}
        leading={<Truck size={20} aria-hidden />}
        chevron
      />
    </Card>
  );
}
