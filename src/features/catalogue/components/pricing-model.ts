import type { PricingRow } from "@/contracts/catalogue";
import {
  dzdToEur,
  formatEur,
  parseDzdInput,
  parseRateInput,
  rateFromDb,
  toDb,
} from "@/domain/money";
import { DEFAULT_VOLUME_ML, type VolumeMl } from "@/domain/sale-line";

/**
 * La grille tarifaire telle qu'on la saisit sur la fiche (06 E19 zone 3) : une sous-section par contenance
 * réelle, 80 ml d'abord (la contenance par défaut), puis 10 et 50 ml. Une contenance vide n'est pas envoyée :
 * la grille envoyée est l'état cible COMPLET (A-6), un volume absent est retiré.
 */

export const FORM_VOLUMES: readonly VolumeMl[] = [DEFAULT_VOLUME_ML, 10, 50];

export type PricingDraft = { price: string; cost: string; rate: string };
export type PricingDrafts = Record<VolumeMl, PricingDraft>;

const EMPTY: PricingDraft = { price: "", cost: "", rate: "" };

/** « 120.00 » → « 120 » ; « 119.90 » → « 119,90 » (saisie française). */
export function decimalToInput(value: string): string {
  return value.replace(/^(-?\d+)\.(\d+)$/, (_, int: string, frac: string) => {
    const trimmed = frac.replace(/0+$/, "");
    return trimmed === "" ? int : `${int},${trimmed}`;
  });
}

export function draftsFrom(rows: readonly PricingRow[]): PricingDrafts {
  const drafts: PricingDrafts = { 10: { ...EMPTY }, 50: { ...EMPTY }, 80: { ...EMPTY } };
  for (const row of rows) {
    drafts[row.volumeMl] = {
      price: decimalToInput(row.unitPriceEur),
      cost: row.unitCostDzd === null ? "" : decimalToInput(row.unitCostDzd),
      rate: row.exchangeRate === null ? "" : decimalToInput(row.exchangeRate),
    };
  }
  return drafts;
}

export function isDraftEmpty(draft: PricingDraft): boolean {
  return draft.price.trim() === "" && draft.cost.trim() === "" && draft.rate.trim() === "";
}

export type PricingEntryInput = { volumeMl: VolumeMl; unitPriceEur: string; unitCostDzd: string | null; exchangeRate: string | null };

/** Entrée de `pricing` (ordre de saisie) et, pour chaque index, sa contenance — les erreurs du serveur s'y rangent. */
export function pricingInput(drafts: PricingDrafts): { entries: PricingEntryInput[]; volumes: VolumeMl[] } {
  const entries: PricingEntryInput[] = [];
  const volumes: VolumeMl[] = [];
  for (const volume of FORM_VOLUMES) {
    const draft = drafts[volume];
    if (isDraftEmpty(draft)) continue;
    entries.push({
      volumeMl: volume,
      unitPriceEur: draft.price,
      unitCostDzd: draft.cost.trim() === "" ? null : draft.cost,
      exchangeRate: draft.rate.trim() === "" ? null : draft.rate,
    });
    volumes.push(volume);
  }
  return { entries, volumes };
}

/**
 * « Coût en euros 32,49 € » : coût DZD au taux saisi, sinon au taux par défaut des réglages ; `null` si le
 * coût est vide ou illisible.
 */
export function costInEuros(draft: PricingDraft, defaultRate: string): string | null {
  if (draft.cost.trim() === "") return null;
  const cost = parseDzdInput(draft.cost);
  const rate = draft.rate.trim() === "" ? rateFromDb(defaultRate) : parseRateInput(draft.rate);
  if (cost === null || rate === null) return null;
  return formatEur(dzdToEur(cost, rate));
}

/** Messages du serveur (`pricing.1.unitPriceEur`) rangés par contenance et par champ. */
export function pricingErrors(
  fields: Record<string, string> | undefined,
  volumes: readonly VolumeMl[],
): Partial<Record<VolumeMl, Partial<Record<keyof PricingDraft, string>>>> {
  const out: Partial<Record<VolumeMl, Partial<Record<keyof PricingDraft, string>>>> = {};
  const names = { unitPriceEur: "price", unitCostDzd: "cost", exchangeRate: "rate", volumeMl: "price" } as const;
  for (const [key, message] of Object.entries(fields ?? {})) {
    const match = /^pricing\.(\d+)\.(\w+)$/.exec(key);
    if (!match) continue;
    const volume = volumes[Number(match[1])];
    const field = names[match[2] as keyof typeof names];
    if (volume === undefined || !field) continue;
    out[volume] = { ...out[volume], [field]: message };
  }
  return out;
}

/** Deux grilles de saisie identiques (formulaire non modifié). */
export function sameDrafts(a: PricingDrafts, b: PricingDrafts): boolean {
  return FORM_VOLUMES.every((volume) => a[volume].price === b[volume].price && a[volume].cost === b[volume].cost && a[volume].rate === b[volume].rate);
}

/** Taux par défaut lisible en placeholder : « 277 ». */
export function ratePlaceholder(defaultRate: string): string {
  return decimalToInput(toDb(rateFromDb(defaultRate)));
}
