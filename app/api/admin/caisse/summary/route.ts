import { NextResponse } from "next/server";
import { CustomerOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const lineWhere: { sale: { createdAt?: { gte?: Date; lte?: Date } } } = { sale: {} };
    if (fromParam || toParam) {
      lineWhere.sale.createdAt = {};
      if (fromParam) {
        const d = new Date(fromParam);
        if (!Number.isNaN(d.getTime())) lineWhere.sale.createdAt.gte = d;
      }
      if (toParam) {
        const d = new Date(toParam);
        if (!Number.isNaN(d.getTime())) lineWhere.sale.createdAt.lte = d;
      }
    }

    const lines = await prisma.cashSaleLine.findMany({
      where: lineWhere,
      select: {
        buyPriceCents: true,
        sellPriceCents: true,
        quantity: true,
      },
    });

    let revenueCents = 0;
    let costCents = 0;
    let unitsSold = 0;
    for (const l of lines) {
      const q = l.quantity;
      unitsSold += q;
      revenueCents += l.sellPriceCents * q;
      costCents += l.buyPriceCents * q;
    }
    const marginCents = revenueCents - costCents;
    const marginRate = revenueCents > 0 ? marginCents / revenueCents : 0;

    const [saleCount, pendingOrders, fulfilledOrders] = await Promise.all([
      prisma.cashSale.count({
        where: lineWhere.sale.createdAt
          ? { createdAt: lineWhere.sale.createdAt }
          : undefined,
      }),
      prisma.customerOrder.count({ where: { status: CustomerOrderStatus.PENDING } }),
      prisma.customerOrder.count({ where: { status: CustomerOrderStatus.FULFILLED } }),
    ]);

    return NextResponse.json({
      kpis: {
        saleCount,
        unitsSold,
        revenueEuros: centsToEuros(revenueCents),
        costEuros: centsToEuros(costCents),
        marginNetEuros: centsToEuros(marginCents),
        marginRate,
      },
      orders: {
        pending: pendingOrders,
        fulfilled: fulfilledOrders,
      },
    });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_SUMMARY_GET]", error);
    return NextResponse.json({ error: "Impossible de calculer les indicateurs." }, { status: 500 });
  }
}
