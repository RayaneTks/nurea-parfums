import { routes } from "@/app-shell/routes";
import { eur, eurFromWire, toWire, type MoneyString } from "@/domain/money";
import { creancesAnciennes } from "@/server/chiffres";
import { recapDuJour } from "@/server/stats/queries";
import { DayRecap } from "../components/DayRecap";
import { PASSING_CUSTOMER } from "../components/home-model";

/**
 * Clients à relancer : les créances anciennes de `creancesAnciennes()` groupées par la clé de regroupement
 * de E13 (03 §5.8) — EXACTEMENT le même ensemble que l'alerte « n clients à relancer » de l'Accueil, et le
 * même compte. Le total est une somme de montants déjà définis par le chiffre, jamais une redéfinition.
 */
function groupRelances(rows: Awaited<ReturnType<typeof creancesAnciennes>>) {
  const byKey = new Map<string, { key: string; name: string; total: MoneyString; href: string | null }>();
  let total = eur.zero;
  for (const row of rows) {
    total = eur.add(total, eurFromWire(row.due));
    const found = byKey.get(row.customerKey);
    if (found) {
      found.total = toWire(eur.add(eurFromWire(found.total), eurFromWire(row.due)));
      continue;
    }
    byKey.set(row.customerKey, {
      key: row.customerKey,
      name: row.customerName ?? PASSING_CUSTOMER,
      total: row.due,
      href: row.customerId ? routes.client(row.customerId) : null,
    });
  }
  return { clients: [...byKey.values()], total: toWire(total) };
}

/**
 * E02 — le récap d'une journée en un bloc (06 E02). Deux lectures en parallèle : le récap du jour (Encaissé
 * canonique, ventilation par poche, documents, livraisons du lendemain) et les créances anciennes.
 */
export async function DayRecapBlock({ jour }: { jour: string }) {
  const [recap, anciennes] = await Promise.all([recapDuJour(jour), creancesAnciennes()]);
  // La fiche document s'ouvre AU-DESSUS du récap (`?doc=`, A-3), pas en quittant l'écran : on revient au
  // récap en fermant la sheet, sans reperdre le jour affiché.
  const here = routes.journee({ jour: recap.isToday ? undefined : recap.jour });
  return (
    <DayRecap
      recap={recap}
      relances={groupRelances(anciennes)}
      previousHref={routes.journee({ jour: recap.previousDay })}
      nextHref={recap.nextDay ? routes.journee({ jour: recap.nextDay }) : null}
      sheetBase={here}
    />
  );
}
