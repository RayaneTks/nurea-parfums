import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";

export type BatchStatus = "OPEN" | "CLOSED";

/**
 * KPIs cash-basis. On affiche que du concret :
 *  - cashedRevenue : encaissé réel (totalRevenue − remainingDue par vente).
 *  - outstandingRevenue : reste à encaisser (somme remainingDue). Affiché en badge si > 0.
 *  - totalCost : coût des parfums (déjà payé, peu importe encaissement client).
 *  - expenses : dépenses opérationnelles du lot.
 *  - netMargin : cashedRevenue − totalCost − expenses (marge nette concrète).
 *  - marginPct : netMargin / cashedRevenue × 100.
 *
 * `totalRevenue` (facturé) reste exposé pour audit / debug mais l'UI doit utiliser cashedRevenue.
 */
export type BatchRowLite = {
  id: string;
  name: string;
  status: BatchStatus;
  expectedAt: string | null;
  notes: string | null;
  createdAt: string;
  salesCount: number;
  totalRevenue: string;
  cashedRevenue: string;
  outstandingRevenue: string;
  totalCost: string;
  expenses: string;
  netMargin: string;
  marginPct: string;
};

export type BatchExpenseRow = {
  id: string;
  label: string;
  amount: string;
  occurredAt: string;
  notes: string | null;
};

export type BatchSaleRow = {
  id: string;
  customerName: string;
  soldAt: string;
  totalRevenue: string;
  cashedRevenue: string;
  remainingDue: string;
  netMargin: string;
  itemCount: number;
};

export type BatchDetail = BatchRowLite & {
  sales: BatchSaleRow[];
  expensesList: BatchExpenseRow[];
};

function computeKpis(opts: {
  totalRevenue: Decimal;
  outstanding: Decimal;
  totalCost: Decimal;
  expenses: Decimal;
}): {
  cashedRevenue: string;
  outstandingRevenue: string;
  netMargin: string;
  marginPct: string;
} {
  const cashed = opts.totalRevenue.minus(opts.outstanding);
  const net = cashed.minus(opts.totalCost).minus(opts.expenses);
  const pct = cashed.greaterThan(0)
    ? net.dividedBy(cashed).times(100).toFixed(1)
    : "0.0";
  return {
    cashedRevenue: cashed.toFixed(2),
    outstandingRevenue: opts.outstanding.toFixed(2),
    netMargin: net.toFixed(2),
    marginPct: pct,
  };
}

export async function listBatches(): Promise<BatchRowLite[]> {
  const batches = await prisma.batch.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      status: true,
      expectedAt: true,
      notes: true,
      createdAt: true,
      sales: {
        select: {
          totalRevenue: true,
          totalCost: true,
          remainingDue: true,
        },
      },
      expenses: {
        select: { amount: true },
      },
      _count: { select: { sales: true } },
    },
  });

  return batches.map((b) => {
    const rev = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.totalRevenue.toString())),
      new Decimal(0),
    );
    const cost = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.totalCost.toString())),
      new Decimal(0),
    );
    const outstanding = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.remainingDue.toString())),
      new Decimal(0),
    );
    const exp = b.expenses.reduce(
      (acc, e) => acc.plus(new Decimal(e.amount.toString())),
      new Decimal(0),
    );
    const kpis = computeKpis({
      totalRevenue: rev,
      outstanding,
      totalCost: cost,
      expenses: exp,
    });
    return {
      id: b.id,
      name: b.name,
      status: b.status,
      expectedAt: b.expectedAt ? b.expectedAt.toISOString() : null,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      salesCount: b._count.sales,
      totalRevenue: rev.toFixed(2),
      cashedRevenue: kpis.cashedRevenue,
      outstandingRevenue: kpis.outstandingRevenue,
      totalCost: cost.toFixed(2),
      expenses: exp.toFixed(2),
      netMargin: kpis.netMargin,
      marginPct: kpis.marginPct,
    };
  });
}

export async function getBatchById(id: string): Promise<BatchDetail | null> {
  const b = await prisma.batch.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      expectedAt: true,
      notes: true,
      createdAt: true,
      sales: {
        orderBy: { soldAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customer: { select: { fullName: true } },
          soldAt: true,
          totalRevenue: true,
          totalCost: true,
          remainingDue: true,
          _count: { select: { items: true } },
        },
      },
      expenses: {
        orderBy: { occurredAt: "desc" },
        select: {
          id: true,
          label: true,
          amount: true,
          occurredAt: true,
          notes: true,
        },
      },
    },
  });
  if (!b) return null;

  const rev = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.totalRevenue.toString())),
    new Decimal(0),
  );
  const cost = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.totalCost.toString())),
    new Decimal(0),
  );
  const outstanding = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.remainingDue.toString())),
    new Decimal(0),
  );
  const exp = b.expenses.reduce(
    (acc, e) => acc.plus(new Decimal(e.amount.toString())),
    new Decimal(0),
  );
  const kpis = computeKpis({
    totalRevenue: rev,
    outstanding,
    totalCost: cost,
    expenses: exp,
  });

  return {
    id: b.id,
    name: b.name,
    status: b.status,
    expectedAt: b.expectedAt ? b.expectedAt.toISOString() : null,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    salesCount: b.sales.length,
    totalRevenue: rev.toFixed(2),
    cashedRevenue: kpis.cashedRevenue,
    outstandingRevenue: kpis.outstandingRevenue,
    totalCost: cost.toFixed(2),
    expenses: exp.toFixed(2),
    netMargin: kpis.netMargin,
    marginPct: kpis.marginPct,
    sales: b.sales.map((s) => {
      const saleRev = new Decimal(s.totalRevenue.toString());
      const saleCost = new Decimal(s.totalCost.toString());
      const saleDue = new Decimal(s.remainingDue.toString());
      const saleCashed = saleRev.minus(saleDue);
      return {
        id: s.id,
        customerName: s.customer?.fullName ?? s.customerName ?? "Anonyme",
        soldAt: s.soldAt.toISOString(),
        totalRevenue: saleRev.toFixed(2),
        cashedRevenue: saleCashed.toFixed(2),
        remainingDue: saleDue.toFixed(2),
        netMargin: saleCashed.minus(saleCost).toFixed(2),
        itemCount: s._count.items,
      };
    }),
    expensesList: b.expenses.map((e) => ({
      id: e.id,
      label: e.label,
      amount: e.amount.toString(),
      occurredAt: e.occurredAt.toISOString(),
      notes: e.notes,
    })),
  };
}

/**
 * Liste légère pour selects/dropdowns (ex: assigner une vente à un lot).
 * Limite aux batches OPEN par défaut, ordre récents.
 */
export async function listOpenBatchesLite(): Promise<
  Array<{ id: string; name: string; status: BatchStatus }>
> {
  const rows = await prisma.batch.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
    take: 50,
  });
  return rows;
}
