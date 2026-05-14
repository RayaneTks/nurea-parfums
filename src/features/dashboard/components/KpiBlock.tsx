import { Money } from "@/ui/patterns/Money";
import { revenueSummary, startOfMonth, todayStart } from "@/server/kpi/queries";
import { KpiTile } from "./KpiTile";

export async function KpiBlock() {
  const now = new Date();
  const monthRange = { start: startOfMonth(now), end: new Date(now.getTime() + 1000) };
  const todayRange = { start: todayStart(), end: new Date(now.getTime() + 1000) };

  const [month, today] = await Promise.all([
    revenueSummary(monthRange),
    revenueSummary(todayRange),
  ]);

  return (
    <div className="grid grid-cols-2 gap-2">
      <KpiTile
        label="CA aujourd'hui"
        value={<Money value={today.totalRevenue} compact />}
        hint={`${today.count} vente${today.count > 1 ? "s" : ""}`}
        tone="accent"
      />
      <KpiTile
        label="CA ce mois"
        value={<Money value={month.totalRevenue} compact />}
        hint={`${month.count} vente${month.count > 1 ? "s" : ""}`}
      />
      <KpiTile
        label="Marge mois"
        value={<Money value={month.totalMargin} compact tone="success" />}
        hint={`${month.marginPct} %`}
      />
      <KpiTile
        label="Panier moyen"
        value={<Money value={month.avgValue} compact />}
        hint="ce mois"
      />
    </div>
  );
}
