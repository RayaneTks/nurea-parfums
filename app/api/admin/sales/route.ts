import { NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import {
  computeLineTotals,
  parsePeriod,
  periodStartDate,
  sumSaleTotals,
} from "@/lib/gestion/calculations";

export const dynamic = "force-dynamic";

type SaleLineInputBody = {
  perfumeId?: number | null;
  quantity?: number;
  unitPrice?: number | string;
  unitCost?: number | string;
};

type CreateSaleBody = {
  orderId?: string | null;
  customerName?: string | null;
  soldAt?: string | null;
  notes?: string | null;
  items?: SaleLineInputBody[];
};

const saleInclude = {
  items: {
    include: {
      perfume: {
        select: {
          id: true,
          name: true,
          image: true,
          brand: { select: { id: true, name: true } },
        },
      },
    },
  },
  order: { select: { id: true, customerName: true, orderedAt: true } },
} as const;

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const from = periodStartDate(period);

    const sales = await prisma.sale.findMany({
      where: from ? { soldAt: { gte: from } } : undefined,
      orderBy: { soldAt: "desc" },
      include: saleInclude,
    });

    return NextResponse.json({ sales, period });
  } catch (error) {
    console.error("[api/admin/sales][GET]", error);
    return NextResponse.json(
      { error: "Impossible de charger les ventes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    let body: CreateSaleBody;
    try {
      body = (await request.json()) as CreateSaleBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Ajoute au moins une ligne à la vente." },
        { status: 400 },
      );
    }

    const normalizedLines: {
      perfumeId: number | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      lineRevenue: Prisma.Decimal;
      lineCost: Prisma.Decimal;
      lineMargin: Prisma.Decimal;
    }[] = [];

    for (const raw of rawItems) {
      const perfumeIdRaw = raw.perfumeId;
      const perfumeId =
        perfumeIdRaw === null || perfumeIdRaw === undefined
          ? null
          : typeof perfumeIdRaw === "number"
            ? perfumeIdRaw
            : Number(perfumeIdRaw);
      if (perfumeId !== null && (!Number.isFinite(perfumeId) || perfumeId <= 0)) {
        return NextResponse.json(
          { error: "Parfum invalide dans une des lignes." },
          { status: 400 },
        );
      }

      const quantity =
        typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: "Quantité invalide (minimum 1)." },
          { status: 400 },
        );
      }

      const unitPriceN = Number(raw.unitPrice);
      const unitCostN = Number(raw.unitCost);
      if (!Number.isFinite(unitPriceN) || unitPriceN < 0) {
        return NextResponse.json(
          { error: "Prix de vente invalide (doit être ≥ 0)." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(unitCostN) || unitCostN < 0) {
        return NextResponse.json(
          { error: "Coût de revient invalide (doit être ≥ 0)." },
          { status: 400 },
        );
      }

      const totals = computeLineTotals({
        quantity,
        unitPrice: unitPriceN,
        unitCost: unitCostN,
      });
      normalizedLines.push({
        perfumeId: perfumeId ?? null,
        ...totals,
      });
    }

    const perfumeIds = normalizedLines
      .map((l) => l.perfumeId)
      .filter((id): id is number => id !== null);
    const perfumes = perfumeIds.length
      ? await prisma.perfume.findMany({
          where: { id: { in: [...new Set(perfumeIds)] } },
          include: { brand: { select: { id: true, name: true } } },
        })
      : [];
    const perfumeById = new Map(perfumes.map((p) => [p.id, p]));

    for (const line of normalizedLines) {
      if (line.perfumeId !== null && !perfumeById.has(line.perfumeId)) {
        return NextResponse.json(
          { error: "Un des parfums référencés n'existe pas." },
          { status: 404 },
        );
      }
    }

    let linkedOrderId: string | null = null;
    let orderCustomerName: string | null = null;
    if (body.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: body.orderId },
        include: { sale: { select: { id: true } } },
      });
      if (!order) {
        return NextResponse.json({ error: "Ordre introuvable." }, { status: 404 });
      }
      if (order.sale) {
        return NextResponse.json(
          { error: "Cet ordre a déjà une vente associée." },
          { status: 409 },
        );
      }
      linkedOrderId = order.id;
      orderCustomerName = order.customerName;
    }

    const totals = sumSaleTotals(normalizedLines);

    const soldAt =
      body.soldAt && body.soldAt.trim().length > 0 ? new Date(body.soldAt) : new Date();
    if (Number.isNaN(soldAt.getTime())) {
      return NextResponse.json({ error: "Date de vente invalide." }, { status: 400 });
    }

    const customerName =
      body.customerName?.trim() || orderCustomerName || null;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          orderId: linkedOrderId,
          customerName,
          soldAt,
          notes: body.notes?.trim() || null,
          totalRevenue: totals.totalRevenue,
          totalCost: totals.totalCost,
          totalMargin: totals.totalMargin,
          items: {
            create: normalizedLines.map((line) => {
              const perfume = line.perfumeId !== null ? perfumeById.get(line.perfumeId) : null;
              const snapshot = perfume
                ? {
                    perfumeId: perfume.id,
                    name: perfume.name,
                    image: perfume.image,
                    brand: perfume.brand
                      ? { id: perfume.brand.id, name: perfume.brand.name }
                      : null,
                  }
                : { perfumeId: null, name: "Vente libre", image: null, brand: null };
              return {
                perfumeId: line.perfumeId,
                perfumeSnapshot: snapshot,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost,
                lineRevenue: line.lineRevenue,
                lineCost: line.lineCost,
                lineMargin: line.lineMargin,
              };
            }),
          },
        },
        include: saleInclude,
      });

      if (linkedOrderId) {
        await tx.order.update({
          where: { id: linkedOrderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }

      return created;
    });

    await writeAudit(ctx.sub, "sale.create", "Sale", sale.id, {
      itemCount: normalizedLines.length,
      orderId: linkedOrderId,
      totalRevenue: totals.totalRevenue.toString(),
      totalMargin: totals.totalMargin.toString(),
    });

    return NextResponse.json({ sale });
  } catch (error) {
    console.error("[api/admin/sales][POST]", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la vente." },
      { status: 500 },
    );
  }
}
