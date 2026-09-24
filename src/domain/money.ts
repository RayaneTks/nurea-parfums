/**
 * LE module monétaire (docs/refonte/04-ARCHITECTURE.md §5).
 *
 * Seul importeur de `decimal.js-light` du dépôt. Hors d'ici : ni `Number()`, ni
 * `parseFloat`, ni `toFixed` sur un montant, ni `Prisma.Decimal` pour calculer.
 *
 * Les types `Eur`, `Dzd`, `Rate` sont opaques : à l'exécution une instance Decimal,
 * mais aucune de ses méthodes n'est accessible hors de ce fichier. Conséquence
 * voulue : un `Eur` n'est pas sérialisable par React, une fuite vers un composant
 * client échoue au rendu et force le passage par `toWire`.
 *
 * Tous les arrondis sont « demi vers le haut » (loin de zéro sur .5), comme le
 * `round(numeric, 2)` de PostgreSQL. Aucun epsilon : les valeurs sont exactes.
 */
import Decimal from "decimal.js-light";

declare const opaque: unique symbol;
type Opaque<Name extends string> = { readonly [opaque]: Name };

export type Eur = Opaque<"Eur">; // euros, 2 décimales, signé
export type Dzd = Opaque<"Dzd">; // dinars, 2 décimales
export type Rate = Opaque<"Rate">; // dinars pour 1 €, 4 décimales, > 0
export type MoneyString = string & { readonly __wire: "eur" }; // "1234.50" — point, 2 décimales, signe éventuel
export type RateString = string & { readonly __wire: "rate" }; // "277.0000"

// Précision 28 chiffres ; exposants larges pour que toString() ne passe jamais en notation scientifique.
const D = Decimal.clone({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 40,
});
type Dec = InstanceType<typeof D>;

const wrap = <T extends Eur | Dzd | Rate>(d: Dec): T => d as unknown as T;
const raw = (v: Eur | Dzd | Rate): Dec => v as unknown as Dec;

// Bornes des colonnes : Decimal(10,2) pour les euros et les dinars, Decimal(10,4) pour les taux.
// Une saisie au-delà échouerait à l'écriture en base : on la refuse dès la saisie.
const MAX_AMOUNT = new D("99999999.99");
const MAX_RATE = new D("999999.9999");

/** Quotient entier de a ÷ b arrondi demi vers le haut, a et b entiers — exact, sans troncature de précision. */
function roundHalfUpDiv(numerator: Dec, denominator: Dec): Dec {
  const negative = numerator.isNegative() !== denominator.isNegative();
  const n = numerator.abs();
  const d = denominator.abs();
  let q = n.dividedToIntegerBy(d);
  if (n.mod(d).times(2).gte(d)) q = q.plus(1);
  return negative ? q.negated() : q;
}

/** Entier `v × 10^places` ; lève si `v` porte plus de `places` décimales (valeur hors contrat). */
function scaled(v: Dec, places: number): Dec {
  const s = v.times(new D(10).pow(places));
  if (!s.isInteger()) throw new RangeError(`money: ${v.toString()} a plus de ${places} décimales`);
  return s;
}

// ── Saisie utilisateur ─────────────────────────────────────────────────────────

/**
 * Virgule ou point, espaces de toute sorte (dont U+202F collé depuis un montant formaté),
 * « 12, » accepté pendant la frappe. Pas de séparateur de milliers « . » : « 1.234,56 »
 * est ambigu, donc refusé.
 */
function parseInput(
  text: string,
  o: { maxDecimals: number; signed: boolean; suffix?: string },
): Dec | null {
  let s = text.replace(/\s+/g, "");
  if (o.suffix && s.endsWith(o.suffix)) s = s.slice(0, -o.suffix.length);
  let negative = false;
  if (/^[-\u2212+]/.test(s)) {
    if (!o.signed) return null;
    negative = s[0] !== "+";
    s = s.slice(1);
  }
  const m = /^(\d*)(?:[.,](\d*))?$/.exec(s);
  if (!m) return null;
  const int = m[1] ?? "";
  const frac = m[2] ?? "";
  if (int === "" && frac === "") return null;
  if (frac.length > o.maxDecimals) return null;
  const value = new D(`${int || "0"}.${frac || "0"}`);
  return negative ? value.negated() : value;
}

export function parseEurInput(text: string, o?: { signed?: boolean }): Eur | null {
  const v = parseInput(text, { maxDecimals: 2, signed: o?.signed ?? false, suffix: "€" });
  if (v === null || v.abs().gt(MAX_AMOUNT)) return null;
  return wrap<Eur>(v);
}

export function parseDzdInput(text: string): Dzd | null {
  const v = parseInput(text, { maxDecimals: 2, signed: false, suffix: "DA" });
  if (v === null || v.gt(MAX_AMOUNT)) return null;
  return wrap<Dzd>(v);
}

export function parseRateInput(text: string): Rate | null {
  const v = parseInput(text, { maxDecimals: 4, signed: false });
  if (v === null || !v.gt(0) || v.gt(MAX_RATE)) return null;
  return wrap<Rate>(v);
}

// ── Frontières ─────────────────────────────────────────────────────────────────

/**
 * Lecture d'une valeur de base (Prisma.Decimal, ou `numeric::text` d'un $queryRaw).
 * Plus de décimales que la colonne n'en porte = requête fautive (agrégat non casté) :
 * on lève plutôt que d'arrondir en silence.
 */
function fromDb(v: { toString(): string } | string, places: number, kind: string): Dec {
  const text = typeof v === "string" ? v : v.toString();
  let d: Dec;
  try {
    d = new D(text.trim());
  } catch {
    throw new TypeError(`${kind}: valeur de base illisible « ${text} »`);
  }
  scaled(d, places);
  return d;
}

export function eurFromDb(v: { toString(): string } | string): Eur {
  return wrap<Eur>(fromDb(v, 2, "eurFromDb"));
}

export function dzdFromDb(v: { toString(): string } | string): Dzd {
  return wrap<Dzd>(fromDb(v, 2, "dzdFromDb"));
}

export function rateFromDb(v: { toString(): string } | string): Rate {
  const d = fromDb(v, 4, "rateFromDb");
  if (!d.gt(0)) throw new RangeError(`rateFromDb: taux non positif « ${d.toString()} »`);
  return wrap<Rate>(d);
}

/**
 * Chaîne passée telle quelle à Prisma. Au moins deux décimales ; un taux garde les siennes.
 * (Les trois types partagent la même représentation : la précision se lit sur la valeur.)
 */
export function toDb(v: Eur | Dzd | Rate): string {
  const d = raw(v);
  return d.toFixed(Math.max(2, d.decimalPlaces()));
}

export function toWire(v: Eur): MoneyString {
  return raw(v).toFixed(2) as MoneyString;
}

const WIRE = /^-?\d+\.\d{2}$/;

/** Une `MoneyString` mal formée est une erreur de programmation (le contrat zod l'a validée). */
export function eurFromWire(v: MoneyString): Eur {
  if (!WIRE.test(v)) throw new TypeError(`eurFromWire: « ${v} » n'est pas une MoneyString`);
  return wrap<Eur>(new D(v));
}

// ── Arithmétique exacte ────────────────────────────────────────────────────────

export const eur: {
  zero: Eur;
  add(a: Eur, b: Eur): Eur;
  sub(a: Eur, b: Eur): Eur;
  neg(a: Eur): Eur;
  times(a: Eur, quantity: number): Eur; // quantité entière ≥ 0, sinon exception
  sum(values: readonly Eur[]): Eur;
  max(a: Eur, b: Eur): Eur;
  min(a: Eur, b: Eur): Eur;
  clampZero(a: Eur): Eur;
  compare(a: Eur, b: Eur): -1 | 0 | 1;
  isZero(a: Eur): boolean;
  isNegative(a: Eur): boolean;
} = {
  zero: wrap<Eur>(new D(0)),
  add: (a, b) => wrap<Eur>(raw(a).plus(raw(b))),
  sub: (a, b) => wrap<Eur>(raw(a).minus(raw(b))),
  neg: (a) => wrap<Eur>(raw(a).negated()),
  times: (a, quantity) => {
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new RangeError(`eur.times: quantité entière ≥ 0 attendue, reçu ${quantity}`);
    }
    return wrap<Eur>(raw(a).times(quantity));
  },
  sum: (values) => wrap<Eur>(values.reduce<Dec>((acc, v) => acc.plus(raw(v)), new D(0))),
  max: (a, b) => (raw(a).gte(raw(b)) ? a : b),
  min: (a, b) => (raw(a).lte(raw(b)) ? a : b),
  clampZero: (a) => (raw(a).isNegative() ? wrap<Eur>(new D(0)) : a),
  compare: (a, b) => raw(a).comparedTo(raw(b)),
  isZero: (a) => raw(a).isZero(),
  // decimal.js-light ne connaît pas −0 : isNegative() suffit.
  isNegative: (a) => raw(a).isNegative(),
};

/** Dinars : l'achat d'un lot se relit dans la monnaie où il a été payé (E06 « Achat des parfums »). */
export const dzd: {
  zero: Dzd;
  times(a: Dzd, quantity: number): Dzd; // quantité entière ≥ 0, sinon exception
  sum(values: readonly Dzd[]): Dzd;
} = {
  zero: wrap<Dzd>(new D(0)),
  times: (a, quantity) => {
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new RangeError(`dzd.times: quantité entière ≥ 0 attendue, reçu ${quantity}`);
    }
    return wrap<Dzd>(raw(a).times(quantity));
  },
  sum: (values) => wrap<Dzd>(values.reduce<Dec>((acc, v) => acc.plus(raw(v)), new D(0))),
};

/** Deux taux égaux à la décimale près (277 et 277,0000) : même groupe d'achat. */
export function sameRate(a: Rate, b: Rate): boolean {
  return raw(a).eq(raw(b));
}

// ── Règles métier ──────────────────────────────────────────────────────────────

/**
 * LA conversion DZD → EUR : arrondi(cost ÷ rate, 2), demi vers le haut. Appelée à l'écriture
 * d'une ligne seulement ; le résultat est figé dans `SaleLine.unitCostEur` (03 §4.8).
 * Calcul en entiers (centimes × 10⁴ ÷ taux × 10⁴) : exact quelle que soit la période du quotient.
 */
export function dzdToEur(cost: Dzd, rate: Rate): Eur {
  const cents = roundHalfUpDiv(scaled(raw(cost), 2).times(10_000), scaled(raw(rate), 4));
  return wrap<Eur>(cents.dividedBy(100));
}

/** « La moitié » : arrondie à l'euro, au centime si l'euro donne 0 (0,90 € → 0,45 €, 06 F-4.2-08). */
export function halfForCash(v: Eur): Eur {
  const half = raw(v).dividedBy(2);
  const euros = half.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return wrap<Eur>(euros.isZero() ? half.toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : euros);
}

/** « 23,4 » (une décimale, demi vers le haut) ; null si `whole` est nul. */
export function percentOf(part: Eur, whole: Eur): string | null {
  if (raw(whole).isZero()) return null;
  const tenths = roundHalfUpDiv(scaled(raw(part), 2).times(1000), scaled(raw(whole), 2));
  const abs = tenths.abs();
  const text = `${abs.dividedToIntegerBy(10).toFixed(0)},${abs.mod(10).toFixed(0)}`;
  return tenths.isNegative() ? `${MINUS}${text}` : text;
}

// ── Affichage ──────────────────────────────────────────────────────────────────

// Formatage à la main, pas Intl : le serveur et l'iPhone doivent produire exactement les mêmes
// caractères (hydratation), et les moteurs divergent sur l'espace avant « € ».
const NNBSP = "\u202F";
const MINUS = "\u2212";

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/**
 * « 1 234,50 € » ; `signed` affiche « + » devant un positif.
 * `compact` (tuiles KPI) masque seulement des centimes nuls : un chiffre d'argent n'est jamais
 * arrondi à l'affichage, sinon deux tuiles cessent de s'additionner.
 */
export function formatEur(v: Eur, o?: { compact?: boolean; signed?: boolean }): string {
  const d = raw(v);
  const [int = "0", frac] = d.abs().toFixed(o?.compact && d.isInteger() ? 0 : 2).split(".");
  const sign = d.isZero() ? "" : d.isNegative() ? MINUS : o?.signed ? "+" : "";
  return `${sign}${groupThousands(int)}${frac ? `,${frac}` : ""}${NNBSP}€`;
}

/** « 9 000 DA » ; les centimes n'apparaissent que s'ils existent. */
export function formatDzd(v: Dzd): string {
  const d = raw(v);
  const [int = "0", frac] = d.abs().toFixed(d.isInteger() ? 0 : 2).split(".");
  return `${d.isNegative() ? MINUS : ""}${groupThousands(int)}${frac ? `,${frac}` : ""}${NNBSP}DA`;
}

/** « 277 », « 277,5 » : un taux sans ses zéros de fin. */
export function formatRate(v: Rate): string {
  // toFixed(4) porte toujours un point : on retire les zéros de fin, puis le point resté seul.
  const text = raw(v).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  const [int = "0", frac] = text.split(".");
  return `${groupThousands(int)}${frac ? `,${frac}` : ""}`;
}

/** « 1 234 euros 50 » pour VoiceOver (05 §6) ; « 45 centimes » sous l'euro. */
export function spokenEur(v: Eur): string {
  const d = raw(v);
  const abs = d.abs();
  const units = abs.toDecimalPlaces(0, Decimal.ROUND_DOWN);
  const cents = abs.minus(units).times(100);
  const sign = d.isNegative() ? "moins " : "";
  if (units.isZero() && !cents.isZero()) {
    return `${sign}${cents.toFixed(0)} centime${cents.gt(1) ? "s" : ""}`;
  }
  const word = units.gt(1) ? "euros" : "euro";
  return `${sign}${groupThousands(units.toFixed(0))} ${word}${cents.isZero() ? "" : ` ${cents.toFixed(0)}`}`;
}
