/**
 * Libellés et décisions d'écran des clients (06 E12, E14, E20), purs et testés.
 */
import type { CustomerDirectoryEntry, CustomerHistoryRowDTO, CustomerListRowDTO, FrequentPerfumeDTO } from "@/contracts/customers";
import { eur, eurFromWire, type MoneyString } from "@/domain/money";
import { formatPhone, normalizePhone } from "@/domain/phone";
import { cleNom } from "@/lib/nommage";
import { formatDate } from "@/ui/patterns/date-format";

// ── E12 — Liste ────────────────────────────────────────────────────────────────

export type LetterSection = { letter: string; rows: CustomerListRowDTO[] };

/**
 * Sections A–Z dans l'ordre du serveur (clé de tri pliée) : l'initiale vient du serveur, « Élise » est sous « E »
 * (01 §4.10 : elle tombait sous « # »). Une section par suite de lignes de même initiale.
 */
export function sectionsByLetter(rows: readonly CustomerListRowDTO[]): LetterSection[] {
  const sections: LetterSection[] = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.letter === row.letter) last.rows.push(row);
    else sections.push({ letter: row.letter, rows: [row] });
  }
  return sections;
}

/** « 124 clients », « 1 client ». */
export function customersCountLabel(count: number): string {
  return `${count} client${count > 1 ? "s" : ""}`;
}

/** « 5 documents », « 1 document ». */
export function documentsCountLabel(count: number): string {
  return `${count} document${count > 1 ? "s" : ""}`;
}

// ── E14 — Fiche ────────────────────────────────────────────────────────────────

/** Liens directs de la rangée de contact (06 E14 zone 2) : chaque bouton n'existe que si son champ existe. */
export function contactLinks(customer: { phoneE164: string | null; whatsappE164: string | null; snapchat: string | null }) {
  return {
    call: customer.phoneE164 ? `tel:${customer.phoneE164}` : null,
    whatsapp: customer.whatsappE164 ? `https://wa.me/${customer.whatsappE164.replace(/\D/g, "")}` : null,
    snap: customer.snapchat ? `https://www.snapchat.com/add/${encodeURIComponent(customer.snapchat)}` : null,
  };
}

/** Un moyen de contact existe : « Modifier » sur les coordonnées ; sinon « Compléter la fiche » (jamais les deux). */
export function hasContact(customer: { phoneE164: string | null; whatsappE164: string | null; snapchat: string | null }): boolean {
  return customer.phoneE164 !== null || customer.whatsappE164 !== null || customer.snapchat !== null;
}

/** « Vente du 3 août · 2 articles », « Commande du 12 sept. · 1 article ». */
export function historyTitle(row: Pick<CustomerHistoryRowDTO, "origin" | "orderedAt" | "itemCount">, now: Date = new Date()): string {
  const noun = row.origin === "DIRECT_SALE" ? "Vente" : "Commande";
  const items = `${row.itemCount} article${row.itemCount > 1 ? "s" : ""}`;
  return `${noun} du ${formatDate(new Date(row.orderedAt), "short", now)} · ${items}`;
}

/** Légende d'un document hors du cours normal (06 E14 zone 6) : « En attente », « Annulée » ; rien sinon. */
export function historyCaption(row: Pick<CustomerHistoryRowDTO, "status">): string | undefined {
  if (row.status === "PENDING") return "En attente";
  if (row.status === "CANCELLED") return "Annulée";
  return undefined;
}

/** À droite : « À encaisser » d'un document engagé à dû, sinon son « Total » (06 E14, §1.7). */
export function historyAmount(row: Pick<CustomerHistoryRowDTO, "due" | "total">): { kind: "due" | "total"; value: MoneyString } {
  if (row.due !== null && eur.compare(eurFromWire(row.due), eur.zero) > 0) return { kind: "due", value: row.due };
  return { kind: "total", value: row.total };
}

/** « 4 fois · 80 ml », « 1 fois ». */
export function frequentCaption(item: Pick<FrequentPerfumeDTO, "times" | "volumeMl">): string {
  return [`${item.times} fois`, item.volumeMl === null ? null : `${item.volumeMl} ml`].filter(Boolean).join(" · ");
}

/** Un montant non nul (tuile, CTA « Encaisser 140 € »). */
export function isPositive(value: MoneyString): boolean {
  return eur.compare(eurFromWire(value), eur.zero) > 0;
}

// ── E20 — Formulaire ───────────────────────────────────────────────────────────

/**
 * Aperçu normalisé sous le champ, dès que la saisie est reconnue (06 E20) : « 06 12 34 56 78 » → « +33 6 12 34 56 78 ».
 * `null` : champ vide ou saisie pas encore reconnue (le serveur dira pourquoi à l'enregistrement).
 */
export function phonePreview(input: string): string | null {
  const text = input.trim();
  if (text === "") return null;
  const e164 = normalizePhone(text);
  return e164 === null ? null : formatPhone(e164);
}

/** La fiche qui porte déjà ce numéro (« Ce numéro est déjà celui de Lina. »), hors la fiche modifiée. */
export function phoneOwner(
  directory: readonly CustomerDirectoryEntry[],
  input: string,
  selfId: string | null,
): CustomerDirectoryEntry | undefined {
  const e164 = input.trim() === "" ? null : normalizePhone(input);
  if (e164 === null) return undefined;
  return directory.find((entry) => entry.id !== selfId && entry.phoneE164 === e164);
}

/**
 * Alerte d'homonyme en création (06 E20) : même nom normalisé (casse, accents, ponctuation ignorés), ou même
 * téléphone. Le nom compte d'abord : c'est lui qu'on lit.
 */
export function homonymOf(
  directory: readonly CustomerDirectoryEntry[],
  fields: { fullName: string; phone: string },
  selfId: string | null,
): CustomerDirectoryEntry | undefined {
  const key = cleNom(fields.fullName);
  const byName = key.length >= 2 ? directory.find((entry) => entry.id !== selfId && cleNom(entry.fullName) === key) : undefined;
  return byName ?? phoneOwner(directory, fields.phone, selfId);
}

/** « Ce numéro est déjà celui de Lina. » — le texte du serveur (04 §9.3), dit avant l'envoi. */
export function phoneTakenMessage(owner: Pick<CustomerDirectoryEntry, "fullName">): string {
  return `Ce numéro est déjà celui de ${owner.fullName}.`;
}
