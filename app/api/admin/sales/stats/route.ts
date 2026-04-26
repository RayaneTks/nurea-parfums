import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { parsePeriod, periodStartDate } from "@/lib/gestion/calculations";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const from = periodStartDate(period);

    const where = from ? { soldAt: { gte: from } } : undefined;

    const [aggregate, count] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: { totalRevenue: true, totalCost: true, totalMargin: true },
      }),
      prisma.sale.count({ where }),
    ]);

    const totalRevenue = aggregate._sum.totalRevenue ?? null;
    const totalCost = aggregate._sum.totalCost ?? null;
    const totalMargin = aggregate._sum.totalMargin ?? null;

    const averageSale =
      count > 0 && totalRevenue
        ? Number(totalRevenue) / count
        : 0;

    return NextResponse.json({
      period,
      count,
      totalRevenue: totalRevenue ? totalRevenue.toString() : "0.00",
      totalCost: totalCost ? totalCost.toString() : "0.00",
      totalMargin: totalMargin ? totalMargin.toString() : "0.00",
      averageSale: averageSale.toFixed(2),
    });
  } catch (error) {
    console.error("[api/admin/sales/stats][GET]", error);
    return jsonFromPrismaGestionError(
      error,
      "Impossible de calculer les statistiques.",
    );
  }
}
