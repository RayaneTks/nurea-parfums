import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";

export type BatchStatus = "OPEN" | "CLOSED";

/**
 * KPIs cash-basis. Tout est concret, ventes + commandes assignées au lot pèsent ensemble :
 *  - cashedRevenue  = encaissé total (ventes encaissées + acomptes/soldes des commandes À traiter/Livrée).
 *  - salesCashed / ordersCashed : décomposition pour drill-down.
 *  - outstandingRevenue = reste à encaisser (ventes + commandes).
 *  - totalCost = coût d'achat des parfums (ventes + commandes assignées — déjà payé au fournisseur).
 *  - expenses = dépenses opérationnelles du lot.
 *  - netMargin = cashedRevenue − totalCost − expenses.
 */
export type BatchRowLite = {
  id: string;
  name: string;
  status: BatchStatus;
  expectedAt: string | null;
  notes: string | null;
  createdAt: string;
  salesCount: number;
  ordersCount: number;
  totalRevenue: string;
  cashedRevenue: string;
  salesCashed: string;
  ordersCashed: string;
  outstandingRevenue: string;
  salesOutstanding: string;
  ordersOutstanding: string;
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

export type BatchOrderRow = {
  id: string;
  customerName: string;
  status: "READY" | "DELIVERED";
  orderedAt: string;
  total: string;
  cashed: string;
  due: string;
  cost: string;
};

export type BatchDetail = BatchRowLite & {
  sales: BatchSaleRow[];
  orders: BatchOrderRow[];
  expensesList: BatchExpenseRow[];
};

type LineForCost = {
  unitPrice: { toString(): string };
  quantity: number;
  unitCost: { toString(): string };
};

type PaymentForSum = { type: string; amount: { toString(): string } };

function orderTotals(items: LineForCost[], payments: PaymentForSum[]): {
  total: Decimal;
  cost: Decimal;
  cashed: Decimal;
  due: Decimal;
} {
  const total = items.reduce(
    (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
    new Decimal(0),
  );
  const cost = items.reduce(
    (acc, it) => acc.plus(new Decimal(it.unitCost.toString()).times(it.quantity)),
    new Decimal(0),
  );
  let deposit = new Decimal(0);
  let balance = new Decimal(0);
  let refund = new Decimal(0);
  for (const p of payments) {
    const amt = new Decimal(p.amount.toString());
    if (p.type === "DEPOSIT") deposit = deposit.plus(amt);
    else if (p.type === "BALANCE") balance = balance.plus(amt);
    else if (p.type === "REFUND") refund = refund.plus(amt);
  }
  const paid = deposit.plus(balance).minus(refund);
  const cappedPaid = paid.greaterThan(total) ? total : paid;
  const cashed = cappedPaid.greaterThan(0) ? cappedPaid : new Decimal(0);
  const due = total.greaterThan(paid) ? total.minus(paid) : new Decimal(0);
  return { total, cost, cashed, due };
}

function computeKpis(opts: {
  salesRevenue: Decimal;
  salesOutstanding: Decimal;
  salesCost: Decimal;
  ordersCashed: Decimal;
  ordersDue: Decimal;
  ordersCost: Decimal;
  expenses: Decimal;
}): {
  cashedRevenue: string;
  salesCashed: string;
  ordersCashed: string;
  outstandingRevenue: string;
  salesOutstanding: string;
  ordersOutstanding: string;
  totalCost: string;
  netMargin: string;
  marginPct: string;
} {
  const salesCashed = opts.salesRevenue.minus(opts.salesOutstanding);
  const cashed = salesCashed.plus(opts.ordersCashed);
  const totalCost = opts.salesCost.plus(opts.ordersCost);
  const outstanding = opts.salesOutstanding.plus(opts.ordersDue);
  const net = cashed.minus(totalCost).minus(opts.expenses);
  const pct = cashed.greaterThan(0)
    ? net.dividedBy(cashed).times(100).toFixed(1)
    : "0.0";
  return {
    cashedRevenue: cashed.toFixed(2),
    salesCashed: salesCashed.toFixed(2),
    ordersCashed: opts.ordersCashed.toFixed(2),
    outstandingRevenue: outstanding.toFixed(2),
    salesOutstanding: opts.salesOutstanding.toFixed(2),
    ordersOutstanding: opts.ordersDue.toFixed(2),
    totalCost: totalCost.toFixed(2),
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
      orders: {
        where: { status: { in: ["READY", "DELIVERED"] }, sale: null },
        select: {
          items: { select: { unitPrice: true, quantity: true, unitCost: true } },
          payments: { select: { type: true, amount: true } },
        },
      },
      expenses: { select: { amount: true } },
      _count: { select: { sales: true } },
    },
  });

  return batches.map((b) => {
    const salesRev = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.totalRevenue.toString())),
      new Decimal(0),
    );
    const salesCost = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.totalCost.toString())),
      new Decimal(0),
    );
    const salesOut = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.remainingDue.toString())),
      new Decimal(0),
    );
    let ordersCashed = new Decimal(0);
    let ordersDue = new Decimal(0);
    let ordersCost = new Decimal(0);
    for (const o of b.orders) {
      const t = orderTotals(o.items as LineForCost[], o.payments);
      ordersCashed = ordersCashed.plus(t.cashed);
      ordersDue = ordersDue.plus(t.due);
      ordersCost = ordersCost.plus(t.cost);
    }
    const exp = b.expenses.reduce(
      (acc, e) => acc.plus(new Decimal(e.amount.toString())),
      new Decimal(0),
    );
    const kpis = computeKpis({
      salesRevenue: salesRev,
      salesOutstanding: salesOut,
      salesCost,
      ordersCashed,
      ordersDue,
      ordersCost,
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
      ordersCount: b.orders.length,
      totalRevenue: salesRev.toFixed(2),
      cashedRevenue: kpis.cashedRevenue,
      salesCashed: kpis.salesCashed,
      ordersCashed: kpis.ordersCashed,
      outstandingRevenue: kpis.outstandingRevenue,
      salesOutstanding: kpis.salesOutstanding,
      ordersOutstanding: kpis.ordersOutstanding,
      totalCost: kpis.totalCost,
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
      orders: {
        where: { status: { in: ["READY", "DELIVERED"] }, sale: null },
        orderBy: { orderedAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customer: { select: { fullName: true } },
          status: true,
          orderedAt: true,
          items: { select: { unitPrice: true, quantity: true, unitCost: true } },
          payments: { select: { type: true, amount: true } },
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

  const salesRev = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.totalRevenue.toString())),
    new Decimal(0),
  );
  const salesCost = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.totalCost.toString())),
    new Decimal(0),
  );
  const salesOut = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.remainingDue.toString())),
    new Decimal(0),
  );

  const orderRows: BatchOrderRow[] = [];
  let ordersCashed = new Decimal(0);
  let ordersDue = new Decimal(0);
  let ordersCost = new Decimal(0);
  for (const o of b.orders) {
    const t = orderTotals(o.items as LineForCost[], o.payments);
    ordersCashed = ordersCashed.plus(t.cashed);
    ordersDue = ordersDue.plus(t.due);
    ordersCost = ordersCost.plus(t.cost);
    orderRows.push({
      id: o.id,
      customerName: o.customer?.fullName ?? o.customerName ?? "Anonyme",
      status: o.status as "READY" | "DELIVERED",
      orderedAt: o.orderedAt.toISOString(),
      total: t.total.toFixed(2),
      cashed: t.cashed.toFixed(2),
      due: t.due.toFixed(2),
      cost: t.cost.toFixed(2),
    });
  }

  const exp = b.expenses.reduce(
    (acc, e) => acc.plus(new Decimal(e.amount.toString())),
    new Decimal(0),
  );
  const kpis = computeKpis({
    salesRevenue: salesRev,
    salesOutstanding: salesOut,
    salesCost,
    ordersCashed,
    ordersDue,
    ordersCost,
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
    ordersCount: orderRows.length,
    totalRevenue: salesRev.toFixed(2),
    cashedRevenue: kpis.cashedRevenue,
    salesCashed: kpis.salesCashed,
    ordersCashed: kpis.ordersCashed,
    outstandingRevenue: kpis.outstandingRevenue,
    salesOutstanding: kpis.salesOutstanding,
    ordersOutstanding: kpis.ordersOutstanding,
    totalCost: kpis.totalCost,
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
    orders: orderRows,
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
