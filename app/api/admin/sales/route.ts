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
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { isValidVolumeMl } from "@/lib/gestion/orderLineValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SaleLineInputBody = {
  perfumeId?: number | null;
  /** Snapshot manuel envoyé par le client pour les lignes "saisie libre" (perfumeId === null). */
  perfumeSnapshot?: {
    name?: string;
    brandName?: string;
    /** ID marque catalogue choisie via picker, même pour parfum hors catalogue. */
    brandId?: string | null;
    image?: string | null;
  } | null;
  quantity?: number;
  unitPrice?: number | string;
  unitCost?: number | string;
  unitCostDzd?: number | string | null;
  exchangeRate?: number | string | null;
  volumeMl?: number;
  /** Note libre par ligne (préservée si bridge Order → Sale). */
  note?: string | null;
};

type CreateSaleBody = {
  orderId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerContact?: string | null;
  soldAt?: string | null;
  notes?: string | null;
  remainingDue?: number | string | null;
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
    return jsonFromPrismaGestionError(error, "Impossible de charger les ventes.");
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
      manualName: string | null;
      manualBrand: string | null;
      manualBrandId: string | null;
      volumeMl: number;
      quantity: number;
      unitPrice: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      unitCostDzd: Prisma.Decimal | null;
      exchangeRate: Prisma.Decimal | null;
      lineRevenue: Prisma.Decimal;
      lineCost: Prisma.Decimal;
      lineMargin: Prisma.Decimal;
      note: string | null;
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

      const vol =
        raw.volumeMl === undefined || raw.volumeMl === null
          ? 100
          : Number(raw.volumeMl);
      if (!isValidVolumeMl(vol)) {
        return NextResponse.json(
          { error: "Volume invalide (30, 50 ou 100 ml par ligne)." },
          { status: 400 },
        );
      }

      const unitPriceN = Number(raw.unitPrice);
      const unitCostN = Number(raw.unitCost);
      if (!Number.isFinite(unitPriceN) || unitPriceN < 0) {
        return NextResponse.json(
          { error: "Prix client invalide (doit être ≥ 0)." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(unitCostN) || unitCostN < 0) {
        return NextResponse.json(
          { error: "Prix d'achat (ton coût) invalide (doit être ≥ 0)." },
          { status: 400 },
        );
      }

      const totals = computeLineTotals({
        quantity,
        unitPrice: unitPriceN,
        unitCost: unitCostN,
      });
      const ucdRaw = raw.unitCostDzd;
      const exRaw = raw.exchangeRate;
      const ucdN = ucdRaw ? Number(ucdRaw) : null;
      const exN = exRaw ? Number(exRaw) : null;

      let manualName: string | null = null;
      let manualBrand: string | null = null;
      let manualBrandId: string | null = null;
      if (perfumeId === null) {
        const snap = raw.perfumeSnapshot;
        const name = snap?.name?.trim();
        if (!name || name.length < 2) {
          return NextResponse.json(
            { error: "Nom du parfum requis (≥ 2 caractères) pour une saisie libre." },
            { status: 400 },
          );
        }
        manualName = name;
        manualBrand = snap?.brandName?.trim() || "Hors catalogue";
        manualBrandId = snap?.brandId?.trim() || null;
      }

      const noteVal = typeof raw.note === "string" ? raw.note.trim() : "";

      normalizedLines.push({
        perfumeId: perfumeId ?? null,
        manualName,
        manualBrand,
        manualBrandId,
        volumeMl: vol,
        unitCostDzd: ucdN !== null && Number.isFinite(ucdN) ? new Prisma.Decimal(ucdN) : null,
        exchangeRate: exN !== null && Number.isFinite(exN) ? new Prisma.Decimal(exN) : null,
        ...totals,
        note: noteVal.length > 0 ? noteVal : null,
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
        return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
      }
      if (order.sale) {
        return NextResponse.json(
          { error: "Cette commande a déjà une vente associée." },
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
    const customerContact = body.customerContact?.trim() || null;

    let linkedCustomerId: string | null = null;
    if (body.customerId) {
      const found = await prisma.customer.findUnique({
        where: { id: body.customerId },
        select: { id: true },
      });
      if (!found) {
        return NextResponse.json({ error: "Client introuvable." }, { status: 400 });
      }
      linkedCustomerId = found.id;
    }

    const remainingDueRaw = body.remainingDue;
    const remainingDueN =
      remainingDueRaw === null || remainingDueRaw === undefined || remainingDueRaw === ""
        ? 0
        : Number(String(remainingDueRaw).replace(",", "."));
    if (!Number.isFinite(remainingDueN) || remainingDueN < 0) {
      return NextResponse.json(
        { error: "Reste à payer invalide (doit être ≥ 0)." },
        { status: 400 },
      );
    }
    if (remainingDueN > Number(totals.totalRevenue)) {
      return NextResponse.json(
        { error: "Reste à payer ne peut pas dépasser le total de la vente." },
        { status: 400 },
      );
    }

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          orderId: linkedOrderId,
          customerId: linkedCustomerId,
          customerName,
          customerContact,
          soldAt,
          notes: body.notes?.trim() || null,
          totalRevenue: totals.totalRevenue,
          totalCost: totals.totalCost,
          totalMargin: totals.totalMargin,
          remainingDue: new Prisma.Decimal(remainingDueN),
          items: {
            create: normalizedLines.map((line) => {
              const perfume = line.perfumeId !== null ? perfumeById.get(line.perfumeId) : null;
              const snapshot = perfume
                ? {
                    perfumeId: perfume.id,
                    name: perfume.name,
                    brandName: perfume.brand?.name ?? null,
                    brandId: perfume.brand?.id ?? null,
                    image: perfume.image,
                    volumeMl: line.volumeMl,
                  }
                : {
                    perfumeId: null,
                    name: line.manualName ?? "Sans nom",
                    brandName: line.manualBrand ?? "Hors catalogue",
                    brandId: line.manualBrandId,
                    image: null,
                    volumeMl: line.volumeMl,
                  };
              return {
                perfumeId: line.perfumeId,
                perfumeSnapshot: snapshot,
                quantity: line.quantity,
                volumeMl: line.volumeMl,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost,
                unitCostDzd: line.unitCostDzd,
                exchangeRate: line.exchangeRate,
                lineRevenue: line.lineRevenue,
                lineCost: line.lineCost,
                note: line.note,
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
    return jsonFromPrismaGestionError(error, "Impossible d'enregistrer la vente.");
  }
}
