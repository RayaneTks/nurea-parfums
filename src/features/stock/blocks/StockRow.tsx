import { PackageOpen } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { availableBottles } from "@/server/stock/queries";
import { Card } from "@/ui/primitives/Card";
import { ListRow } from "@/ui/primitives/ListRow";
import { stockCount } from "../components/stock-model";

/** Rangée « En stock » (Catalogue, Accueil), seulement quand des flacons attendent d'être revendus. */
export async function StockRow() {
  const bottles = await availableBottles();
  if (bottles.length === 0) return null;
  return (
    <Card padding={0}>
      <ListRow
        href={routes.stock()}
        primary="En stock"
        secondary={stockCount(bottles.length)}
        leading={<PackageOpen size={20} aria-hidden />}
        chevron
      />
    </Card>
  );
}
