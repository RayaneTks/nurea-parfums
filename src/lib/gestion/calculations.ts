import { Prisma } from "@prisma/client";

export type SaleLineInput = {
  quantity: number;
  unitPrice: number | string;
  unitCost: number | string;
};

export type SaleLineTotals = {
  quantity: number;
  unitPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  lineRevenue: Prisma.Decimal;
  lineCost: Prisma.Decimal;
  lineMargin: Prisma.Decimal;
};

export type SaleTotals = {
  totalRevenue: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  totalMargin: Prisma.Decimal;
};

/**
 * Calcule les totaux figés d'une ligne de vente (snapshot à la création).
 * Utilise Prisma.Decimal pour éviter toute erreur de float.
 */
export function computeLineTotals(line: SaleLineInput): SaleLineTotals {
  const qty = Math.max(1, Math.floor(line.quantity));
  const price = new Prisma.Decimal(line.unitPrice);
  const cost = new Prisma.Decimal(line.unitCost);
  const lineRevenue = price.mul(qty);
  const lineCost = cost.mul(qty);
  const lineMargin = lineRevenue.sub(lineCost);
  return {
    quantity: qty,
    unitPrice: price,
    unitCost: cost,
    lineRevenue,
    lineCost,
    lineMargin,
  };
}

/** Somme des totaux à partir de lignes déjà calculées. */
export function sumSaleTotals(lines: Array<Pick<SaleLineTotals, "lineRevenue" | "lineCost" | "lineMargin">>): SaleTotals {
  const totalRevenue = lines.reduce(
    (acc, l) => acc.add(l.lineRevenue),
    new Prisma.Decimal(0),
  );
  const totalCost = lines.reduce(
    (acc, l) => acc.add(l.lineCost),
    new Prisma.Decimal(0),
  );
  const totalMargin = lines.reduce(
    (acc, l) => acc.add(l.lineMargin),
    new Prisma.Decimal(0),
  );
  return { totalRevenue, totalCost, totalMargin };
}

/** Période de reporting pour la Compta. */
export type StatsPeriod = "week" | "month" | "all";

export function periodStartDate(period: StatsPeriod, now: Date = new Date()): Date | null {
  if (period === "all") return null;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "week") {
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek);
  } else if (period === "month") {
    d.setDate(1);
  }
  return d;
}

export function parsePeriod(raw: string | null | undefined): StatsPeriod {
  if (raw === "week" || raw === "month") return raw;
  return "all";
}
