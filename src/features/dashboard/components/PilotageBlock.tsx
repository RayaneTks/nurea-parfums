import { Money } from "@/ui/patterns/Money";
import { KpiTile } from "./KpiTile";
import { listSalesGroupedByCustomer } from "@/server/sales/queries";
import { revenueSummary } from "@/server/kpi/queries";
import { treasurySummary } from "@/server/treasury/queries";
import Decimal from "decimal.js-light";

/**
 * Pilotage : bénéfice net du mois en cours + prévision de trésorerie
 * (trésorerie actuelle + reste à encaisser si tout est payé).
 */
export async function PilotageBlock() {
  const [month, global, treasury] = await Promise.all([
    listSalesGroupedByCustomer({ period: "month" }),
    revenueSummary(),
    treasurySummary(),
  ]);

  const monthNet = month.summary.netMargin;
  const monthCashed = month.summary.cashedRevenue;
  const outstanding = new Decimal(global.outstandingRevenue);
  const forecast = new Decimal(treasury.total).plus(outstanding).toFixed(2);

  return (
    <div>
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
        Pilotage
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <KpiTile
          label="Bénéfice net (mois)"
          value={<Money value={monthNet} compact tone="auto" />}
          hint={`encaissé ${new Decimal(monthCashed).toFixed(0)} €`}
          href="/admin/compta"
        />
        <KpiTile
          label="Prévision trésorerie"
          value={<Money value={forecast} compact />}
          hint={
            outstanding.greaterThan(0)
              ? `dont ${outstanding.toFixed(0)} € à encaisser`
              : "tout encaissé"
          }
          href="/admin/compta"
        />
      </div>
    </div>
  );
}
