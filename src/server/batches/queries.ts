import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";

export type BatchStatus = "OPEN" | "CLOSED";

export type BatchRowLite = {
  id: string;
  name: string;
  status: BatchStatus;
  expectedAt: string | null;
  notes: string | null;
  createdAt: string;
  salesCount: number;
  totalRevenue: string;
  totalCost: string;
  grossMargin: string;
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
  totalMargin: string;
  itemCount: number;
};

export type BatchDetail = BatchRowLite & {
  sales: BatchSaleRow[];
  expensesList: BatchExpenseRow[];
};

function computeKpis(opts: {
  totalRevenue: Decimal;
  totalCost: Decimal;
  expenses: Decimal;
}): {
  grossMargin: string;
  netMargin: string;
  marginPct: string;
} {
  const gross = opts.totalRevenue.minus(opts.totalCost);
  const net = gross.minus(opts.expenses);
  const pct = opts.totalRevenue.greaterThan(0)
    ? net.dividedBy(opts.totalRevenue).times(100).toFixed(1)
    : "0.0";
  return {
    grossMargin: gross.toFixed(2),
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
    const exp = b.expenses.reduce(
      (acc, e) => acc.plus(new Decimal(e.amount.toString())),
      new Decimal(0),
    );
    const kpis = computeKpis({ totalRevenue: rev, totalCost: cost, expenses: exp });
    return {
      id: b.id,
      name: b.name,
      status: b.status,
      expectedAt: b.expectedAt ? b.expectedAt.toISOString() : null,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      salesCount: b._count.sales,
      totalRevenue: rev.toFixed(2),
      totalCost: cost.toFixed(2),
      expenses: exp.toFixed(2),
      grossMargin: kpis.grossMargin,
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
          totalMargin: true,
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
  const exp = b.expenses.reduce(
    (acc, e) => acc.plus(new Decimal(e.amount.toString())),
    new Decimal(0),
  );
  const kpis = computeKpis({ totalRevenue: rev, totalCost: cost, expenses: exp });

  return {
    id: b.id,
    name: b.name,
    status: b.status,
    expectedAt: b.expectedAt ? b.expectedAt.toISOString() : null,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    salesCount: b.sales.length,
    totalRevenue: rev.toFixed(2),
    totalCost: cost.toFixed(2),
    expenses: exp.toFixed(2),
    grossMargin: kpis.grossMargin,
    netMargin: kpis.netMargin,
    marginPct: kpis.marginPct,
    sales: b.sales.map((s) => ({
      id: s.id,
      customerName: s.customer?.fullName ?? s.customerName ?? "Anonyme",
      soldAt: s.soldAt.toISOString(),
      totalRevenue: s.totalRevenue.toString(),
      totalMargin: s.totalMargin.toString(),
      itemCount: s._count.items,
    })),
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
