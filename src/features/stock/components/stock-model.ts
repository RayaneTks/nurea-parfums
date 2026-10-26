import type { StockBottleDTO } from "@/contracts/stock";
import { eurFromWire, formatEur } from "@/domain/money";
import { formatDate } from "@/ui/patterns/date-format";

/** « 1 flacon prêt à être revendu », « 3 flacons prêts à être revendus ». */
export function stockCount(count: number): string {
  return count === 1 ? "1 flacon prêt à être revendu" : `${count} flacons prêts à être revendus`;
}

/** « Yara · 80 ml ». */
export function bottleName(bottle: Pick<StockBottleDTO, "perfumeName" | "volumeMl">): string {
  return [bottle.perfumeName, bottle.volumeMl ? `${bottle.volumeMl} ml` : null].filter(Boolean).join(" · ");
}

/** « Commande de Faycal, désistée le 20 oct. » ; sans nom : « Commande désistée le 20 oct. ». */
export function bottleOrigin(bottle: Pick<StockBottleDTO, "sourceCustomer" | "createdAt">, now?: Date): string {
  const day = formatDate(new Date(bottle.createdAt), "short", now);
  return bottle.sourceCustomer ? `Commande de ${bottle.sourceCustomer}, désistée le ${day}` : `Commande désistée le ${day}`;
}

/** Version courte, pour une rangée de liste : « De Faycal Amri · 22 oct. ». */
export function bottleShortOrigin(bottle: Pick<StockBottleDTO, "sourceCustomer" | "createdAt">, now?: Date): string {
  const day = formatDate(new Date(bottle.createdAt), "short", now);
  return bottle.sourceCustomer ? `De ${bottle.sourceCustomer} · ${day}` : `Désistée · ${day}`;
}

/** Phrase d'explication de la feuille d'un flacon : le prix prévu, et pourquoi le coût d'achat compte. */
export function bottleDetail(bottle: Pick<StockBottleDTO, "plannedPriceEur" | "unitCostEur" | "sourceCustomer">): string {
  const price = formatEur(eurFromWire(bottle.plannedPriceEur));
  const planned = bottle.sourceCustomer ? `Il était prévu à ${price} pour ${bottle.sourceCustomer}.` : `Il était prévu à ${price}.`;
  return bottle.unitCostEur === null
    ? `${planned} Son prix d'achat n'avait pas été noté.`
    : `${planned} Son prix d'achat le suit : ta marge restera juste.`;
}
