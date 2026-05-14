import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";

export type SaleRowLite = {
  id: string;
  customerName: string | null;
  customerId: string | null;
  soldAt: string;
  totalRevenue: string;
  totalCost: string;
  totalMargin: string;
  remainingDue: string;
  itemCount: number;
  orderId: string | null;
  batchId: string | null;
  batchName: string | null;
};

export type SaleItemSnapshot = {
  name: string;
  brandName: string | null;
  image?: string | null;
};

export type SaleDetailRow = SaleRowLite & {
  notes: string | null;
  batch: { id: string; name: string; status: "OPEN" | "CLOSED" } | null;
  items: Array<{
    id: string;
    perfumeId: number | null;
    quantity: number;
    volumeMl: number | null;
    unitPrice: string;
    unitCost: string;
    unitCostDzd: string | null;
    exchangeRate: string | null;
    lineRevenue: string;
    lineCost: string;
    lineMargin: string;
    snapshot: SaleItemSnapshot;
  }>;
};

export type CustomerGroup = {
  customerKey: string;            // customerId si présent, sinon "anon:" + customerName, sinon "anon:no-name"
  customerId: string | null;
  customerName: string;
  salesCount: number;
  totalRevenue: string;
  totalMargin: string;
  lastSoldAt: string;
  sales: SaleRowLite[];
};

export type Period = "week" | "month" | "all";

export type ComptaListResult = {
  groups: CustomerGroup[];
  summary: {
    totalRevenue: string;
    totalCost: string;
    totalMargin: string;
    totalDebt: string;
    marginPct: string;
    salesCount: number;
    avgValue: string;
  };
};

function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

function groupCustomerKey(customerId: string | null, customerName: string | null): string {
  if (customerId) return `c:${customerId}`;
  const name = (customerName ?? "").trim();
  if (name.length > 0) return `n:${normalizeKey(name)}`;
  return "anon:no-name";
}

/**
 * Liste les ventes groupées par client, triées par dernière vente desc dans chaque
 * groupe et par "groupe le plus récent" en outer order.
 *
 * `q` filtre par nom client (case-insensitive, substring).
 */
export async function listSalesGroupedByCustomer(params: {
  period: Period;
  q?: string;
}): Promise<ComptaListResult> {
  const since = periodStart(params.period);
  const where = {
    ...(since ? { soldAt: { gte: since } } : {}),
    ...(params.q && params.q.trim().length > 0
      ? {
          OR: [
            { customerName: { contains: params.q.trim(), mode: "insensitive" as const } },
            {
              customer: {
                fullName: { contains: params.q.trim(), mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { soldAt: "desc" },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      soldAt: true,
      totalRevenue: true,
      totalCost: true,
      totalMargin: true,
      remainingDue: true,
      orderId: true,
      batchId: true,
      batch: { select: { name: true } },
      customer: { select: { fullName: true } },
      _count: { select: { items: true } },
    },
  });

  // Group by customer key.
  const map = new Map<string, CustomerGroup>();
  let totalRevenue = new Decimal(0);
  let totalCost = new Decimal(0);
  let totalMargin = new Decimal(0);
  let totalDebt = new Decimal(0);

  for (const s of sales) {
    const resolvedName = s.customer?.fullName ?? s.customerName ?? "Anonyme";
    const key = groupCustomerKey(s.customerId, resolvedName);
    const row: SaleRowLite = {
      id: s.id,
      customerName: resolvedName,
      customerId: s.customerId,
      soldAt: s.soldAt.toISOString(),
      totalRevenue: s.totalRevenue.toString(),
      totalCost: s.totalCost.toString(),
      totalMargin: s.totalMargin.toString(),
      remainingDue: s.remainingDue.toString(),
      itemCount: s._count.items,
      orderId: s.orderId,
      batchId: s.batchId,
      batchName: s.batch?.name ?? null,
    };

    totalRevenue = totalRevenue.plus(new Decimal(row.totalRevenue));
    totalCost = totalCost.plus(new Decimal(row.totalCost));
    totalMargin = totalMargin.plus(new Decimal(row.totalMargin));
    totalDebt = totalDebt.plus(new Decimal(row.remainingDue));

    const existing = map.get(key);
    if (existing) {
      existing.sales.push(row);
      existing.salesCount += 1;
      existing.totalRevenue = new Decimal(existing.totalRevenue).plus(row.totalRevenue).toFixed(2);
      existing.totalMargin = new Decimal(existing.totalMargin).plus(row.totalMargin).toFixed(2);
      if (row.soldAt > existing.lastSoldAt) existing.lastSoldAt = row.soldAt;
    } else {
      map.set(key, {
        customerKey: key,
        customerId: s.customerId,
        customerName: resolvedName,
        salesCount: 1,
        totalRevenue: row.totalRevenue,
        totalMargin: row.totalMargin,
        lastSoldAt: row.soldAt,
        sales: [row],
      });
    }
  }

  const groups = [...map.values()].sort((a, b) => (a.lastSoldAt < b.lastSoldAt ? 1 : -1));

  const salesCount = sales.length;
  const marginPct = totalRevenue.greaterThan(0)
    ? totalMargin.dividedBy(totalRevenue).times(100).toFixed(1)
    : "0.0";
  const avgValue = salesCount > 0 ? totalRevenue.dividedBy(salesCount).toFixed(2) : "0.00";

  return {
    groups,
    summary: {
      totalRevenue: totalRevenue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalMargin: totalMargin.toFixed(2),
      totalDebt: totalDebt.toFixed(2),
      marginPct,
      salesCount,
      avgValue,
    },
  };
}

export async function getSaleById(saleId: string): Promise<SaleDetailRow | null> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      soldAt: true,
      totalRevenue: true,
      totalCost: true,
      totalMargin: true,
      remainingDue: true,
      orderId: true,
      batchId: true,
      batch: { select: { id: true, name: true, status: true } },
      notes: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          perfumeId: true,
          quantity: true,
          volumeMl: true,
          unitPrice: true,
          unitCost: true,
          unitCostDzd: true,
          exchangeRate: true,
          lineRevenue: true,
          lineCost: true,
          lineMargin: true,
          perfumeSnapshot: true,
          perfume: {
            select: { id: true, name: true, image: true, brand: { select: { name: true } } },
          },
        },
      },
      customer: { select: { fullName: true } },
    },
  });
  if (!sale) return null;

  function toSnap(raw: unknown, fallback: SaleItemSnapshot): SaleItemSnapshot {
    if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      return {
        name: typeof o.name === "string" ? o.name : fallback.name,
        brandName:
          typeof o.brandName === "string"
            ? o.brandName
            : typeof o.brand === "string"
              ? o.brand
              : fallback.brandName,
        image: typeof o.image === "string" ? o.image : fallback.image ?? null,
      };
    }
    return fallback;
  }

  return {
    id: sale.id,
    customerId: sale.customerId,
    customerName: sale.customer?.fullName ?? sale.customerName ?? "Anonyme",
    soldAt: sale.soldAt.toISOString(),
    totalRevenue: sale.totalRevenue.toString(),
    totalCost: sale.totalCost.toString(),
    totalMargin: sale.totalMargin.toString(),
    remainingDue: sale.remainingDue.toString(),
    itemCount: sale.items.length,
    orderId: sale.orderId,
    batchId: sale.batchId,
    batchName: sale.batch?.name ?? null,
    batch: sale.batch
      ? { id: sale.batch.id, name: sale.batch.name, status: sale.batch.status }
      : null,
    notes: sale.notes,
    items: sale.items.map((it) => {
      const fallback: SaleItemSnapshot = {
        name: it.perfume?.name ?? "Hors catalogue",
        brandName: it.perfume?.brand.name ?? null,
        image: it.perfume?.image ?? null,
      };
      const snapshot = toSnap(it.perfumeSnapshot, fallback);
      return {
        id: it.id,
        perfumeId: it.perfumeId,
        quantity: it.quantity,
        volumeMl: it.volumeMl,
        unitPrice: it.unitPrice.toString(),
        unitCost: it.unitCost.toString(),
        unitCostDzd: it.unitCostDzd?.toString() ?? null,
        exchangeRate: it.exchangeRate?.toString() ?? null,
        lineRevenue: it.lineRevenue.toString(),
        lineCost: it.lineCost.toString(),
        lineMargin: it.lineMargin.toString(),
        snapshot,
      };
    }),
  };
}
