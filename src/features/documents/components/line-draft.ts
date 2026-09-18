/**
 * Une ligne en saisie, telle que la tiennent le composeur (06 E11 zone 5) et l'édition en place de la fiche
 * (S01 zone 4) : les deux écrans partagent la même carte (`LineCard`) et ces règles pures, testées.
 *
 * Le texte des champs est gardé tel que saisi (« 119,9 » pendant la frappe) ; les montants ne sont lus que par le
 * module monétaire.
 */
import type { PickerPerfume, PricingRow } from "@/contracts/catalogue";
import type { DocumentLineDTO } from "@/contracts/documents";
import type { ActionError } from "@/contracts/result";
import {
  dzdToEur,
  eur,
  eurFromWire,
  formatDzd,
  formatEur,
  parseDzdInput,
  parseEurInput,
  parseRateInput,
  type Eur,
  type MoneyString,
} from "@/domain/money";
import { DEFAULT_VOLUME_ML, MAX_LINE_QUANTITY, isVolumeMl, type VolumeMl } from "@/domain/sale-line";
import { stockLabel } from "@/domain/stock";
import { amountToInputText } from "@/ui/primitives/MoneyInput";

export type LineDraft = {
  id: string;
  /** Ligne ajoutée pendant cette saisie : son article part avec elle (T1, ou T2 sous un nouvel identifiant). */
  isNew: boolean;
  /** null : hors catalogue, ou parfum supprimé depuis (seul `isOffCatalog` les distingue). */
  perfumeId: number | null;
  isOffCatalog: boolean;
  perfumeName: string;
  brandName: string | null;
  imageUrl: string | null;
  /** null, 30 ou 100 : ligne reprise hors règle (« Choisir le volume »). */
  volumeMl: number | null;
  quantity: number;
  deliveredQuantity: number;
  /** Prix saisi ; vide sur une ligne offerte. */
  price: string;
  isGift: boolean;
  /** Dernier prix saisi : restauré quand « Offert » est décoché. */
  lastPrice: string;
  cost: string;
  rate: string;
  note: string;
  /**
   * Ligne posée avant l'arrivée du sélecteur (tuile récente, `?parfum=`) : sa mémoire de prix la complète dès
   * qu'elle est lue, tant que la ligne n'a pas été retouchée.
   */
  awaitingPricing?: boolean;
};

/** « 30000.00 » → « 30000 », « 277.5000 » → « 277,5 ». */
export function decimalText(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "").replace(".", ",");
}

/** Une ligne écrite, ouverte en édition en place (S01). */
export function draftOfDocumentLine(line: DocumentLineDTO): LineDraft {
  const price = line.isGift ? "" : amountToInputText(eurFromWire(line.unitPriceEur));
  return {
    id: line.id,
    isNew: false,
    perfumeId: line.perfumeId,
    isOffCatalog: line.isOffCatalog,
    perfumeName: line.perfumeName,
    brandName: line.brandName,
    imageUrl: line.imageUrl,
    volumeMl: line.volumeMl,
    quantity: line.quantity,
    deliveredQuantity: line.deliveredQuantity,
    price,
    isGift: line.isGift,
    lastPrice: price,
    cost: decimalText(line.unitCostDzd),
    rate: decimalText(line.exchangeRate),
    note: line.note ?? "",
  };
}

/** Empreinte d'une liste de lignes : « une modification a-t-elle eu lieu ? ». */
export function lineSignature(lines: readonly LineDraft[]): string {
  return JSON.stringify(lines.map(({ lastPrice: _last, imageUrl: _image, ...rest }) => ({ ...rest, price: rest.isGift ? "" : rest.price })));
}

export type PricingSource = {
  /** Mémoire de prix du volume (N8), si elle existe. */
  pricing?: PricingRow;
  /** Prix à défaut de mémoire : dernier prix pratiqué (« Vendus récemment »). */
  fallbackPrice?: MoneyString | null;
  /** Taux proposé sans mémoire (réglage N3). */
  defaultRate?: string | null;
};

/** Prix, coût et taux d'une ligne à ce volume, depuis la mémoire de prix (06 E11 : changer de volume re-remplit). */
function pricedFields(source: PricingSource): Pick<LineDraft, "price" | "lastPrice" | "cost" | "rate"> {
  const { pricing, fallbackPrice, defaultRate } = source;
  const price = pricing ? amountToInputText(eurFromWire(pricing.unitPriceEur)) : fallbackPrice ? amountToInputText(eurFromWire(fallbackPrice)) : "";
  return {
    price,
    lastPrice: price,
    cost: decimalText(pricing?.unitCostDzd ?? null),
    rate: decimalText(pricing?.exchangeRate ?? defaultRate ?? null),
  };
}

/** Une ligne neuve d'un parfum du catalogue : volume mémorisé (sinon 80 ml), prix, coût et taux pré-remplis. */
export function newCatalogueLine(
  id: string,
  perfume: Pick<PickerPerfume, "id" | "name" | "brandName" | "image"> & { pricing?: readonly PricingRow[] },
  options: { volumeMl?: VolumeMl | null; fallbackPrice?: MoneyString | null; defaultRate?: string | null } = {},
): LineDraft {
  const volumeMl = options.volumeMl ?? DEFAULT_VOLUME_ML;
  const pricing = perfume.pricing?.find((row) => row.volumeMl === volumeMl);
  return {
    id,
    isNew: true,
    perfumeId: perfume.id,
    isOffCatalog: false,
    perfumeName: perfume.name,
    brandName: perfume.brandName,
    imageUrl: perfume.image || null,
    volumeMl,
    quantity: 1,
    deliveredQuantity: 0,
    isGift: false,
    note: "",
    ...pricedFields({ pricing, fallbackPrice: options.fallbackPrice, defaultRate: options.defaultRate }),
  };
}

/** Une ligne hors catalogue (06 S05 sous-formulaire) : 80 ml proposés, prix à saisir, taux par défaut. */
export function newOffCatalogLine(id: string, name: string, brandName: string | null, defaultRate: string | null = null): LineDraft {
  return {
    id,
    isNew: true,
    perfumeId: null,
    isOffCatalog: true,
    perfumeName: name,
    brandName,
    imageUrl: null,
    volumeMl: DEFAULT_VOLUME_ML,
    quantity: 1,
    deliveredQuantity: 0,
    price: "",
    isGift: false,
    lastPrice: "",
    cost: "",
    rate: decimalText(defaultRate),
    note: "",
  };
}

/**
 * La mémoire de prix arrive après la ligne (sélecteur lu après la tuile) : prix, coût et taux du volume sont
 * complétés, le prix déjà proposé est gardé s'il n'y a pas de mémoire.
 */
export function withArrivedPricing(line: LineDraft, pricing: PricingRow | undefined, defaultRate: string | null): LineDraft {
  const { awaitingPricing: _done, ...rest } = line;
  if (!pricing) return { ...rest, rate: rest.rate || decimalText(defaultRate) };
  const fields = pricedFields({ pricing, defaultRate });
  return { ...rest, ...fields, price: rest.isGift ? rest.price : fields.price };
}

/**
 * Changer de volume (06 E11 zone 5) : prix, coût et taux re-remplis depuis la mémoire de prix du nouveau volume ;
 * sans mémoire pour ce volume, la saisie en cours est gardée. Une ligne offerte le reste.
 */
export function withVolume(line: LineDraft, volumeMl: number, pricing: PricingRow | undefined): LineDraft {
  if (!pricing) return { ...line, volumeMl };
  const fields = pricedFields({ pricing });
  return { ...line, volumeMl, lastPrice: fields.price, price: line.isGift ? line.price : fields.price, cost: fields.cost, rate: fields.rate };
}

/** « Offert » coché : prix mis de côté ; décoché : dernier prix restauré (05 §3.2 `GiftToggle`). */
export function withGift(line: LineDraft, checked: boolean): LineDraft {
  return checked ? { ...line, isGift: true, lastPrice: line.price } : { ...line, isGift: false, price: line.lastPrice };
}

export function withQuantity(line: LineDraft, quantity: number): LineDraft {
  return { ...line, quantity: Math.min(Math.max(quantity, 1), MAX_LINE_QUANTITY) };
}

export type LineMissing = { field: "volume" | "price" | "rate"; label: string };

/** Ce qui manque à une ligne pour être enregistrée, dans l'ordre où on le corrige (06 E11, table du CTA). */
export function missingOf(line: LineDraft): LineMissing | null {
  if (!isVolumeMl(line.volumeMl)) return { field: "volume", label: `Choisir le volume · ${line.perfumeName}` };
  const price = parseEurInput(line.price);
  if (!line.isGift && (price === null || eur.isZero(price))) {
    return { field: "price", label: `Ajouter le prix · ${line.perfumeName} ${line.volumeMl} ml` };
  }
  if (line.cost.trim() !== "" && line.rate.trim() === "") return { field: "rate", label: `Ajouter le taux · ${line.perfumeName}` };
  return null;
}

/** Messages du serveur rangés par ligne : `lines.<index>.<champ>` (contrat) ou `lines.<id>.<champ>` (writer). */
export function errorsByLine(error: ActionError | null, lines: readonly LineDraft[]): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  for (const [path, message] of Object.entries(error?.fields ?? {})) {
    const match = /^lines\.([^.]+)\.(\w+)$/.exec(path);
    if (!match) continue;
    const key = match[1] as string;
    const id = /^\d+$/.test(key) ? lines[Number(key)]?.id : key;
    if (!id) continue;
    out.set(id, { ...(out.get(id) ?? {}), [match[2] as string]: message });
  }
  return out;
}

/** Prix unitaire lu (0 pour une ligne offerte) ; null tant que le prix n'est pas un montant. */
export function unitPriceOf(line: LineDraft): Eur | null {
  return line.isGift ? eur.zero : parseEurInput(line.price);
}

/** Coût unitaire en euros de la saisie ; null si le coût ou le taux manque (« Coût à compléter »). */
export function unitCostOf(line: LineDraft): Eur | null {
  const cost = parseDzdInput(line.cost);
  const rate = parseRateInput(line.rate);
  return cost && rate ? dzdToEur(cost, rate) : null;
}

/** Σ quantité × prix ; les lignes sans prix lisible comptent 0 (le CTA dit ce qui manque). */
export function draftTotal(lines: readonly LineDraft[]): Eur {
  return eur.sum(lines.map((line) => eur.times(unitPriceOf(line) ?? eur.zero, line.quantity)));
}

/** « Marge avant dépenses » de la saisie (06 §1.7) ; null si un coût manque. */
export function draftMargin(lines: readonly LineDraft[]): Eur | null {
  let costs = eur.zero;
  for (const line of lines) {
    const cost = unitCostOf(line);
    if (cost === null) return null;
    costs = eur.add(costs, eur.times(cost, line.quantity));
  }
  return eur.sub(draftTotal(lines), costs);
}

/** Rangée repliée « Coût » : « 9 000 DA · taux 277 · 32,49 € », « Taux à compléter » ou « Coût à compléter ». */
export function costSummary(line: LineDraft): { text: string; unknown: boolean } {
  const cost = parseDzdInput(line.cost);
  const rate = parseRateInput(line.rate);
  const base = cost && rate
    ? { text: `${formatDzd(cost)} · taux ${line.rate} · ${formatEur(dzdToEur(cost, rate))}`, unknown: false }
    : line.cost.trim()
      ? { text: "Taux à compléter", unknown: true }
      : { text: "Coût à compléter", unknown: true };
  return line.note.trim() ? { ...base, text: `${base.text} · ${line.note.trim()}` } : base;
}

/**
 * Aide de la mémoire de prix (N8) sous le prix : « dernier prix : 110,00 € » quand la saisie s'en écarte, « Aucun
 * prix mémorisé pour 50 ml » quand il n'y a ni mémoire ni prix. Rien pour une ligne offerte ou hors catalogue.
 */
export function priceHint(line: LineDraft, pricing: PricingRow | undefined): string | null {
  if (line.isGift || line.perfumeId === null || !isVolumeMl(line.volumeMl)) return null;
  if (!pricing) return line.price.trim() === "" ? `Aucun prix mémorisé pour ${line.volumeMl} ml` : null;
  const typed = parseEurInput(line.price);
  const remembered = eurFromWire(pricing.unitPriceEur);
  return typed !== null && eur.compare(typed, remembered) !== 0 ? `dernier prix : ${formatEur(remembered)}` : null;
}

/** Un badge au plus sur une ligne ou une tuile (05 §3.3) : « Rupture » / « Stock bas » / « Masqué ». */
export function stockBadgeOf(perfume: Pick<PickerPerfume, "stockStatus" | "status"> | undefined): { label: string; tone: "danger" | "warning" | "neutral" } | null {
  if (!perfume) return null;
  if (perfume.stockStatus === "out") return { label: stockLabel("out"), tone: "danger" };
  if (perfume.stockStatus === "low") return { label: stockLabel("low"), tone: "warning" };
  if (perfume.status === "DRAFT") return { label: "Masqué", tone: "neutral" };
  return null;
}

/** L'article d'une ligne neuve, tel que le contrat l'attend ; une ligne existante garde le sien (absent). */
export function lineItemOf(line: LineDraft): { kind: "catalogue"; perfumeId: number } | { kind: "offCatalog"; name: string; brandName: string | null } | undefined {
  if (!line.isNew) return undefined;
  if (line.perfumeId !== null) return { kind: "catalogue", perfumeId: line.perfumeId };
  return { kind: "offCatalog", name: line.perfumeName, brandName: line.brandName };
}

/** Les champs de saisie d'une ligne pour `createDocumentAction` (T1) ou `updateDocumentAction` (T2). */
export function lineFields(line: LineDraft) {
  return {
    volumeMl: line.volumeMl as VolumeMl,
    quantity: line.quantity,
    unitPriceEur: line.isGift ? null : line.price,
    isGift: line.isGift,
    unitCostDzd: line.cost.trim() || null,
    exchangeRate: line.rate.trim() || null,
    note: line.note.trim() || null,
  };
}
