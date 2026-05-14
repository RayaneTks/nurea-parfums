import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import { unstable_cache } from "next/cache";
import { tagFor } from "@/lib/admin/cache-tags";

export type PeriodRange = { start: Date; end: Date };

export function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function daysAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type RevenueSummary = {
  totalRevenue: string;
  totalCost: string;
  totalMargin: string;
  marginPct: string;
  count: number;
  avgValue: string;
};

const cachedRevenueSummary = unstable_cache(
  async (start: Date, end: Date) =>
    prisma.sale.aggregate({
      where: { soldAt: { gte: start, lt: end } },
      _sum: { totalRevenue: true, totalCost: true, totalMargin: true },
      _count: true,
    }),
  ["kpi-revenue-summary"],
  { tags: [tagFor.kpi(), tagFor.sales()], revalidate: 60 },
);

export async function revenueSummary(range: PeriodRange): Promise<RevenueSummary> {
  const agg = await cachedRevenueSummary(range.start, range.end);

  const totalRevenue = new Decimal((agg._sum.totalRevenue ?? 0).toString());
  const totalCost = new Decimal((agg._sum.totalCost ?? 0).toString());
  const totalMargin = new Decimal((agg._sum.totalMargin ?? 0).toString());
  const count = agg._count;

  const marginPct = totalRevenue.greaterThan(0)
    ? totalMargin.dividedBy(totalRevenue).times(100).toFixed(1)
    : "0.0";

  const avgValue = count > 0 ? totalRevenue.dividedBy(count).toFixed(2) : "0.00";

  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalCost: totalCost.toFixed(2),
    totalMargin: totalMargin.toFixed(2),
    marginPct,
    count,
    avgValue,
  };
}

export type TopPerfumeRow = {
  perfumeId: number | null;
  name: string;
  brand: string | null;
  quantity: number;
  revenue: string;
  source: "catalog" | "manual";
};

export async function topPerfumes(range: PeriodRange, limit = 5): Promise<TopPerfumeRow[]> {
  type Row = {
    key: string;
    perfume_id: number | null;
    display_name: string | null;
    display_brand: string | null;
    quantity: bigint;
    revenue: string | null;
  };
  const rows = await prisma.$queryRaw<Row[]>`
    WITH grouped AS (
      SELECT
        CASE
          WHEN si."perfumeId" IS NOT NULL THEN 'catalog:' || si."perfumeId"::text
          ELSE 'manual:' || LOWER(TRIM(COALESCE(si."perfumeSnapshot"->>'name', '')))
        END AS key,
        si."perfumeId" AS perfume_id,
        si."perfumeSnapshot"->>'name' AS snap_name,
        si."perfumeSnapshot"->>'brandName' AS snap_brand,
        si.quantity,
        si."lineRevenue"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      WHERE s."soldAt" >= ${range.start} AND s."soldAt" < ${range.end}
    )
    SELECT
      g.key AS key,
      MAX(g.perfume_id) AS perfume_id,
      COALESCE(p.name, MIN(g.snap_name)) AS display_name,
      COALESCE(b.name, MIN(g.snap_brand)) AS display_brand,
      SUM(g.quantity)::bigint AS quantity,
      SUM(g."lineRevenue")::text AS revenue
    FROM grouped g
    LEFT JOIN "Perfume" p ON p.id = g.perfume_id
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    GROUP BY g.key, p.name, b.name
    HAVING SUM(g.quantity) > 0
    ORDER BY SUM(g."lineRevenue") DESC NULLS LAST
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    perfumeId: r.perfume_id,
    name: r.display_name?.trim() || "Sans nom",
    brand: r.display_brand?.trim() || null,
    quantity: Number(r.quantity ?? 0),
    revenue: new Decimal(r.revenue ?? "0").toFixed(2),
    source: r.perfume_id !== null ? "catalog" : "manual",
  }));
}

export type TopBrandRow = {
  brandId: string;
  name: string;
  quantity: number;
  revenue: string;
};

export async function topBrands(range: PeriodRange, limit = 5): Promise<TopBrandRow[]> {
  // SaleItem → Perfume → Brand via raw SQL aggregation.
  type Row = { brandId: string; name: string; quantity: bigint; revenue: string };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      b.id AS "brandId",
      b.name AS name,
      SUM(si.quantity)::bigint AS quantity,
      SUM(si."lineRevenue")::text AS revenue
    FROM "SaleItem" si
    JOIN "Perfume" p ON si."perfumeId" = p.id
    JOIN "Brand" b ON p."brandId" = b.id
    JOIN "Sale" s ON si."saleId" = s.id
    WHERE s."soldAt" >= ${range.start} AND s."soldAt" < ${range.end}
    GROUP BY b.id, b.name
    ORDER BY SUM(si."lineRevenue") DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    brandId: r.brandId,
    name: r.name,
    quantity: Number(r.quantity),
    revenue: new Decimal(r.revenue ?? "0").toFixed(2),
  }));
}

export type TopCustomerRow = {
  customerId: string | null;
  name: string;
  ordersCount: number;
  revenue: string;
};

export async function topCustomers(range: PeriodRange, limit = 5): Promise<TopCustomerRow[]> {
  const sales = await prisma.sale.groupBy({
    by: ["customerId", "customerName"],
    where: { soldAt: { gte: range.start, lt: range.end } },
    _sum: { totalRevenue: true },
    _count: true,
    orderBy: { _sum: { totalRevenue: "desc" } },
    take: limit,
  });

  return sales.map((s) => ({
    customerId: s.customerId,
    name: s.customerName ?? "Anonyme",
    ordersCount: s._count,
    revenue: (s._sum.totalRevenue ?? new Decimal(0)).toString(),
  }));
}

export type DailyRevenuePoint = {
  date: string;       // YYYY-MM-DD
  revenue: string;
  count: number;
};

export async function dailyRevenue(range: PeriodRange): Promise<DailyRevenuePoint[]> {
  type Row = { day: Date; revenue: string; count: bigint };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      date_trunc('day', "soldAt") AS day,
      SUM("totalRevenue")::text AS revenue,
      COUNT(*)::bigint AS count
    FROM "Sale"
    WHERE "soldAt" >= ${range.start} AND "soldAt" < ${range.end}
    GROUP BY date_trunc('day', "soldAt")
    ORDER BY day ASC
  `;
  return rows.map((r) => ({
    date: r.day.toISOString().slice(0, 10),
    revenue: new Decimal(r.revenue ?? "0").toFixed(2),
    count: Number(r.count),
  }));
}

export type Pipeline = {
  pendingCount: number;
  readyCount: number;
  overdueCount: number;
  dueAmount: string;     // total dû (Orders actives, calc balance)
};

const cachedPipelineCounts = unstable_cache(
  async () => {
    const [pending, ready, overdue] = await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "READY" } }),
      prisma.order.count({
        where: {
          status: { in: ["PENDING", "READY"] },
          deliveryAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return { pending, ready, overdue };
  },
  ["kpi-pipeline-counts"],
  { tags: [tagFor.pipeline(), tagFor.orders()], revalidate: 30 },
);

export async function pipelineCounts(): Promise<Pipeline> {
  const { pending, ready, overdue } = await cachedPipelineCounts();

  // dueAmount : somme (items total) - somme (payments hors REFUND) sur commandes actives.
  type Row = { due: string | null };
  const rows = await prisma.$queryRaw<Row[]>`
    WITH order_totals AS (
      SELECT o.id AS order_id,
        COALESCE(SUM(oi."unitPrice" * oi.quantity), 0) AS total
      FROM "Order" o
      LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
      WHERE o.status IN ('PENDING', 'READY')
      GROUP BY o.id
    ),
    order_paid AS (
      SELECT pt."orderId" AS order_id,
        COALESCE(SUM(CASE WHEN pt.type = 'REFUND' THEN -pt.amount ELSE pt.amount END), 0) AS paid
      FROM "PaymentTransaction" pt
      JOIN "Order" o ON o.id = pt."orderId"
      WHERE o.status IN ('PENDING', 'READY')
      GROUP BY pt."orderId"
    )
    SELECT (
      COALESCE(SUM(ot.total), 0) - COALESCE(SUM(op.paid), 0)
    )::text AS due
    FROM order_totals ot
    LEFT JOIN order_paid op ON op.order_id = ot.order_id
  `;

  const dueAmount = new Decimal(rows[0]?.due ?? "0").toFixed(2);

  return {
    pendingCount: pending,
    readyCount: ready,
    overdueCount: overdue,
    dueAmount,
  };
}
