import Decimal from "decimal.js-light";

/**
 * Money — type-safe currency arithmetic.
 *
 * - Never use `number` for money (float drift).
 * - Always tag with currency via the branded type.
 * - Decimal.js-light handles precision (28 digits).
 *
 * Boundary rules:
 * - DB (Prisma.Decimal)  ←→  Money: via `fromPrismaDecimal()` / `toPrismaDecimal()`
 * - API JSON (string)    ←→  Money: via `parse()` / `serialize()` (string with 2 decimals)
 * - UI display           : `format()` produces "1 234,56 €" / "1 234,56 DZD"
 */

declare const __moneyBrand: unique symbol;

export type Currency = "EUR" | "DZD";

export type Money = {
  readonly amount: Decimal;
  readonly currency: Currency;
  readonly [__moneyBrand]: "Money";
};

function make(amount: Decimal, currency: Currency): Money {
  return { amount, currency, [__moneyBrand]: "Money" } as Money;
}

function toDecimal(v: number | string | Decimal): Decimal {
  if (v instanceof Decimal) return v;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`Money: non-finite number ${v}`);
    return new Decimal(v);
  }
  const cleaned = String(v).replace(",", ".").trim();
  if (cleaned === "") return new Decimal(0);
  const d = new Decimal(cleaned);
  if (!d.isFinite()) throw new Error(`Money: non-finite string ${v}`);
  return d;
}

export function eur(v: number | string | Decimal): Money {
  return make(toDecimal(v), "EUR");
}

export function dzd(v: number | string | Decimal): Money {
  return make(toDecimal(v), "DZD");
}

export function zero(currency: Currency): Money {
  return make(new Decimal(0), currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Money: currency mismatch ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return make(a.amount.plus(b.amount), a.currency);
}

export function sub(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return make(a.amount.minus(b.amount), a.currency);
}

export function mul(a: Money, factor: number | string | Decimal): Money {
  return make(a.amount.times(toDecimal(factor)), a.currency);
}

export function div(a: Money, divisor: number | string | Decimal): Money {
  const d = toDecimal(divisor);
  if (d.isZero()) throw new Error("Money: division by zero");
  return make(a.amount.dividedBy(d), a.currency);
}

export function eq(a: Money, b: Money): boolean {
  if (a.currency !== b.currency) return false;
  return a.amount.equals(b.amount);
}

export function gt(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.amount.greaterThan(b.amount);
}

export function gte(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.amount.greaterThanOrEqualTo(b.amount);
}

export function isPositive(m: Money): boolean {
  return m.amount.isPositive() && !m.amount.isZero();
}

export function isZero(m: Money): boolean {
  return m.amount.isZero();
}

export function sum(items: readonly Money[], currency: Currency): Money {
  return items.reduce<Money>((acc, m) => add(acc, m), zero(currency));
}

/**
 * Convert DZD → EUR using exchange rate (DZD per 1 EUR, e.g. 277).
 */
export function dzdToEur(amount: Money, ratePerEur: number | string | Decimal): Money {
  if (amount.currency !== "DZD") {
    throw new Error(`Money: expected DZD, got ${amount.currency}`);
  }
  const r = toDecimal(ratePerEur);
  if (r.isZero() || r.isNegative()) {
    throw new Error("Money: exchange rate must be positive");
  }
  return make(amount.amount.dividedBy(r), "EUR");
}

/**
 * API serialization. Always 2 decimals string. Stable across locales.
 */
export function serialize(m: Money): string {
  return m.amount.toFixed(2);
}

export function parse(value: string | null | undefined, currency: Currency): Money {
  if (value === null || value === undefined || value === "") return zero(currency);
  return make(toDecimal(value), currency);
}

/**
 * UI display. Locale-aware (fr-FR by default).
 */
const formatters: Record<Currency, Intl.NumberFormat> = {
  EUR: new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  DZD: new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

export function format(m: Money): string {
  return formatters[m.currency].format(m.amount.toNumber());
}

/**
 * Prisma.Decimal interop (kept loose to avoid import cycle).
 */
export type PrismaDecimalLike = { toString(): string };

export function fromPrismaDecimal(d: PrismaDecimalLike, currency: Currency): Money {
  return make(new Decimal(d.toString()), currency);
}

export function toPrismaString(m: Money): string {
  return m.amount.toFixed(2);
}
