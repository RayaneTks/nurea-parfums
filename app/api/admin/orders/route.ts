import { NextResponse } from "next/server";
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { serializeOrder } from "@/lib/gestion/orderJson";
import { purgeEphemeralOrders } from "@/lib/gestion/orderPurge";
import { isValidVolumeMl, parseOptionalMoneyToZero } from "@/lib/gestion/orderLineValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUSES = Object.values(OrderStatus) as OrderStatus[];

const orderInclude = {
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
  sale: { select: { id: true, soldAt: true } },
} as const;

type OrderItemInput = {
  perfumeId?: number;
  quantity?: number;
  note?: string | null;
  volumeMl?: number;
  unitPrice?: number | string;
  unitCost?: number | string;
  unitCostDzd?: number | string | null;
  exchangeRate?: number | string | null;
  isGift?: boolean;
};

type CreateOrderBody = {
  customerName?: string | null;
  customerContact?: string | null;
  deliveryAt?: string | null;
  status?: OrderStatus;
  notes?: string | null;
  depositPaid?: boolean;
  depositAmount?: number | string | null;
  items?: OrderItemInput[];
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    await purgeEphemeralOrders(prisma);

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const includeDelivered = searchParams.get("includeDelivered") === "1";
    const depositParam = searchParams.get("depositPaid");

    const where: Prisma.OrderWhereInput = {};

    if (statusParam && VALID_STATUSES.includes(statusParam as OrderStatus)) {
      where.status = statusParam as OrderStatus;
    } else if (!includeDelivered) {
      where.status = { not: OrderStatus.DELIVERED };
    }

    if (depositParam === "true") {
      where.depositPaid = true;
    } else if (depositParam === "false") {
      where.depositPaid = false;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: [{ deliveryAt: "asc" }, { orderedAt: "desc" }],
      include: orderInclude,
    });

    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    console.error("[api/admin/orders][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger les commandes.");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    let body: CreateOrderBody;
    try {
      body = (await request.json()) as CreateOrderBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Ajoute au moins une ligne (un parfum) à la commande." },
        { status: 400 },
      );
    }

    const customerName = (body.customerName ?? "").trim();
    if (customerName.length < 2) {
      return NextResponse.json(
        { error: "Le nom du client est obligatoire (au moins 2 caractères)." },
        { status: 400 },
      );
    }

    const depositPaid = Boolean(body.depositPaid);
    const depositN = parseOptionalMoneyToZero(body.depositAmount);
    if (depositN === null) {
      return NextResponse.json(
        { error: "Montant d'acompte invalide (nombre ≥ 0 ou laisse vide pour 0 €)." },
        { status: 400 },
      );
    }
    if (depositPaid && depositN <= 0) {
      return NextResponse.json(
        { error: "Indique le montant de l'acompte encaissé (supérieur à 0) ou décoche l'acompte payé." },
        { status: 400 },
      );
    }

    const cleanItems: {
      perfumeId: number;
      quantity: number;
      note: string | null;
      volumeMl: number;
      isGift: boolean;
      unitPrice: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      unitCostDzd: Prisma.Decimal | null;
      exchangeRate: Prisma.Decimal | null;
    }[] = [];

    for (const raw of items) {
      const perfumeId = typeof raw.perfumeId === "number" ? raw.perfumeId : Number(raw.perfumeId);
      const quantity =
        typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity ?? 1);
      const vol =
        raw.volumeMl === undefined || raw.volumeMl === null
          ? 100
          : Number(raw.volumeMl);
      if (!Number.isFinite(perfumeId) || perfumeId <= 0) {
        return NextResponse.json(
          { error: "Parfum invalide dans une des lignes." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: "Quantité invalide (minimum 1)." },
          { status: 400 },
        );
      }
      if (!isValidVolumeMl(vol)) {
        return NextResponse.json(
          { error: "Volume invalide (30, 50 ou 100 ml par ligne)." },
          { status: 400 },
        );
      }
      const up = parseOptionalMoneyToZero(raw.unitPrice);
      const uc = parseOptionalMoneyToZero(raw.unitCost);
      if (up === null) {
        return NextResponse.json(
          { error: "Prix client invalide sur une ligne (nombre ≥ 0 ou vide pour 0 €)." },
          { status: 400 },
        );
      }
      if (uc === null) {
        return NextResponse.json(
          { error: "Prix d'achat (ton coût) invalide sur une ligne (nombre ≥ 0 ou vide pour 0 €)." },
          { status: 400 },
        );
      }
      const ucd = raw.unitCostDzd ? parseOptionalMoneyToZero(raw.unitCostDzd) : null;
      const exRate = raw.exchangeRate ? parseOptionalMoneyToZero(raw.exchangeRate) : null;

      cleanItems.push({
        perfumeId: Math.floor(perfumeId),
        quantity: Math.floor(quantity),
        note: raw.note?.trim() || null,
        volumeMl: vol,
        isGift: Boolean(raw.isGift),
        unitPrice: new Prisma.Decimal(up),
        unitCost: new Prisma.Decimal(uc),
        unitCostDzd: ucd !== null ? new Prisma.Decimal(ucd) : null,
        exchangeRate: exRate !== null ? new Prisma.Decimal(exRate) : null,
      });
    }

    const perfumeIds = [...new Set(cleanItems.map((i) => i.perfumeId))];
    const existingPerfumes = await prisma.perfume.findMany({
      where: { id: { in: perfumeIds } },
      select: { id: true },
    });
    if (existingPerfumes.length !== perfumeIds.length) {
      return NextResponse.json(
        { error: "Un des parfums référencés n'existe pas." },
        { status: 404 },
      );
    }

    const status =
      body.status && VALID_STATUSES.includes(body.status) ? body.status : OrderStatus.PENDING;

    if (status === OrderStatus.CANCELLED) {
      return NextResponse.json(
        { error: "Une commande annulée est supprimée : ne pas créer avec le statut annulé." },
        { status: 400 },
      );
    }

    if (status === OrderStatus.READY && !depositPaid) {
      return NextResponse.json(
        {
          error:
            "Impossible de créer directement en « À traiter » : l'acompte doit d'abord être encaissé, ou crée la commande en attente.",
        },
        { status: 400 },
      );
    }

    const deliveryAt =
      body.deliveryAt && body.deliveryAt.trim().length > 0 ? new Date(body.deliveryAt) : null;
    if (deliveryAt && Number.isNaN(deliveryAt.getTime())) {
      return NextResponse.json({ error: "Date de livraison invalide." }, { status: 400 });
    }

    const customerContact = body.customerContact?.trim() || null;

    const order = await prisma.order.create({
      data: {
        customerName,
        customerContact,
        deliveryAt,
        status,
        notes: body.notes?.trim() || null,
        depositPaid,
        depositAmount: new Prisma.Decimal(depositN),
        items: {
          create: cleanItems,
        },
      },
      include: orderInclude,
    });

    await writeAudit(ctx.sub, "order.create", "Order", order.id, {
      itemCount: cleanItems.length,
      customerName: order.customerName,
      depositPaid,
    });

    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    console.error("[api/admin/orders][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible de créer la commande.");
  }
}
