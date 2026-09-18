/**
 * Écran À encaisser (06 E13) : groupes par client, libellés de document, texte de relance (S09). Purs et testés.
 */
import type { ReceivableDTO } from "@/contracts/chiffres";
import { foldText } from "@/contracts/search";
import { eur, eurFromWire, formatEur, toWire, type MoneyString } from "@/domain/money";
import { formatDate } from "@/ui/patterns/date-format";

export type ReceivableGroup = {
  key: string;
  customerId: string | null;
  /** Nom vivant ou saisi ; « Client de passage » à défaut. */
  name: string;
  total: MoneyString;
  /** Âge de la plus ancienne créance du groupe. */
  ageDays: number;
  isOld: boolean;
  items: ReceivableDTO[];
};

/**
 * Un groupe par client (clé `fiche:` ou `nom:`, 03 §5.8), dans l'ordre des créances — plus ancienne d'abord : le
 * groupe dont la créance est la plus ancienne vient en tête, ses documents du plus ancien au plus récent.
 */
export function groupReceivables(items: readonly ReceivableDTO[]): ReceivableGroup[] {
  const groups = new Map<string, ReceivableGroup>();
  for (const item of items) {
    let group = groups.get(item.customerKey);
    if (!group) {
      group = {
        key: item.customerKey,
        customerId: item.customerId,
        name: item.customerName?.trim() ? item.customerName : "Client de passage",
        total: toWire(eur.zero),
        ageDays: item.ageDays,
        isOld: item.isOld,
        items: [],
      };
      groups.set(item.customerKey, group);
    }
    group.items.push(item);
    group.total = toWire(eur.add(eurFromWire(group.total), eurFromWire(item.due)));
    if (item.ageDays > group.ageDays) group.ageDays = item.ageDays;
    group.isOld = group.isOld || item.isOld;
  }
  return [...groups.values()];
}

/** Filtre client de E13 : tous les mots dans le nom, sans accents. */
export function filterGroups(groups: readonly ReceivableGroup[], q: string): ReceivableGroup[] {
  const terms = foldText(q).split(/\s+/).filter((term) => term.length > 0);
  if (terms.length === 0) return [...groups];
  return groups.filter((group) => {
    const name = foldText(group.name);
    return terms.every((term) => name.includes(term));
  });
}

/** « Vente du 3 août », « Commande livrée le 2 sept. », « Commande du 12 sept. » (06 E13 zone 5). */
export function receivableTitle(item: Pick<ReceivableDTO, "origin" | "orderedAt" | "deliveredAt">, now: Date = new Date()): string {
  if (item.origin === "DIRECT_SALE") return `Vente du ${formatDate(new Date(item.orderedAt), "short", now)}`;
  if (item.deliveredAt) return `Commande livrée le ${formatDate(new Date(item.deliveredAt), "short", now)}`;
  return `Commande du ${formatDate(new Date(item.orderedAt), "short", now)}`;
}

/** « payé 20 € sur 100 € ». */
export function receivableCaption(item: Pick<ReceivableDTO, "paid" | "total">): string {
  return `payé ${formatEur(eurFromWire(item.paid))} sur ${formatEur(eurFromWire(item.total))}`;
}

/** « depuis 42 j », « depuis aujourd'hui ». */
export function ageLabel(days: number): string {
  if (days <= 0) return "depuis aujourd'hui";
  return `depuis ${days} j`;
}

/** « 5 documents · 3 clients ». */
export function countsLabel(documents: number, clients: number): string {
  return `${documents} document${documents > 1 ? "s" : ""} · ${clients} client${clients > 1 ? "s" : ""}`;
}

/**
 * S09 — Le gabarit de relance, constante UNIQUE (06 S09 : « relu avec le gérant avant livraison ») : salutation au
 * nom tel qu'il est enregistré (aucun prénom deviné), une ligne par document engagé à dû, le total, une formule.
 */
export function relanceText(group: Pick<ReceivableGroup, "name" | "items" | "total">): string {
  const lines = group.items.map((item) => `– ${receivableTitle(item)} : ${formatEur(eurFromWire(item.due))} restants`);
  return [
    `Bonjour ${group.name},`,
    "",
    "Petit récapitulatif de ce qu'il reste à régler :",
    ...lines,
    "",
    `Total à régler : ${formatEur(eurFromWire(group.total))}`,
    "",
    "Merci beaucoup, à très vite !",
    "Nuréa Parfums",
  ].join("\n");
}

/** Un document du récap sans créance (S09 « Partager le récap ») : ses montants de la vue, son statut. */
export type RecapItem = {
  origin: ReceivableDTO["origin"];
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  orderedAt: string;
  total: MoneyString;
  /** Dû d'un document engagé ; null sinon. */
  due: MoneyString | null;
};

/** « réglée », « en attente », « 60,00 € restants » : l'état d'un document dans le récap. */
function recapState(item: RecapItem): string {
  if (item.status === "PENDING") return "en attente";
  const due = item.due === null ? null : eurFromWire(item.due);
  return due !== null && eur.compare(due, eur.zero) > 0 ? `${formatEur(due)} restants` : "réglée";
}

/**
 * S09 — Le gabarit du récap sans créance (06 S09, N6), à côté de celui de la relance : même salutation au nom
 * enregistré, les derniers documents (« – Vente du 3 août : 120,00 €, réglée »), une formule. Le gérant retouche le
 * texte s'il le souhaite.
 */
export function recapText(name: string, items: readonly RecapItem[], now: Date = new Date()): string {
  const lines = items.map((item) => {
    const noun = item.origin === "DIRECT_SALE" ? "Vente" : "Commande";
    return `– ${noun} du ${formatDate(new Date(item.orderedAt), "short", now)} : ${formatEur(eurFromWire(item.total))}, ${recapState(item)}`;
  });
  return [
    `Bonjour ${name},`,
    "",
    "Petit récapitulatif des derniers achats :",
    ...lines,
    "",
    "Rien à régler pour le moment. Merci beaucoup, à très vite !",
    "Nuréa Parfums",
  ].join("\n");
}
