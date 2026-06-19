import { Money } from "@/ui/patterns/Money";
import { revenueSummary } from "@/server/kpi/queries";
import { KpiTile } from "./KpiTile";

export async function KpiBlock() {
  const global = await revenueSummary();
  const outstanding = Number(global.outstandingRevenue);
  const hasOutstanding = Number.isFinite(outstanding) && outstanding > 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <KpiTile
        label="Encaissé"
        value={<Money value={global.cashedRevenue} compact />}
        hint={`${global.count} vente${global.count > 1 ? "s" : ""}`}
        tone="accent"
      />
      <KpiTile
        label="Marge nette"
        value={<Money value={global.netMargin} compact tone="auto" />}
        hint={`${global.marginPct} %`}
      />
      <KpiTile
        label="Panier moyen"
        value={<Money value={global.avgCashedValue} compact />}
        hint="encaissé / vente"
      />
      {hasOutstanding ? (
        <KpiTile
          label="Reste à encaisser"
          value={<Money value={global.outstandingRevenue} compact tone="danger" />}
          hint="dû par clients"
        />
      ) : (
        <KpiTile
          label="Coût achats"
          value={<Money value={global.totalCost} compact />}
          hint="cumulés"
        />
      )}
    </div>
  );
}
