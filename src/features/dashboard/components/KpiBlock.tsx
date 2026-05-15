import { Money } from "@/ui/patterns/Money";
import { revenueSummary } from "@/server/kpi/queries";
import { KpiTile } from "./KpiTile";

export async function KpiBlock() {
  const global = await revenueSummary(null);

  return (
    <div className="grid grid-cols-2 gap-2">
      <KpiTile
        label="CA total"
        value={<Money value={global.totalRevenue} compact />}
        hint={`${global.count} vente${global.count > 1 ? "s" : ""}`}
        tone="accent"
      />
      <KpiTile
        label="Marge"
        value={<Money value={global.totalMargin} compact tone="success" />}
        hint={`${global.marginPct} %`}
      />
      <KpiTile
        label="Panier moyen"
        value={<Money value={global.avgValue} compact />}
        hint="sur toutes les ventes"
      />
      <KpiTile
        label="Coût total"
        value={<Money value={global.totalCost} compact />}
        hint="achats cumulés"
      />
    </div>
  );
}
