import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUSES = Object.values(OrderStatus) as OrderStatus[];

type OrderItemInput = {
  perfumeId?: number;
  quantity?: number;
  note?: string | null;
};

type CreateOrderBody = {
  customerName?: string | null;
  deliveryAt?: string | null;
  status?: OrderStatus;
  notes?: string | null;
  items?: OrderItemInput[];
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = statusParam && VALID_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : null;

    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ deliveryAt: "asc" }, { orderedAt: "desc" }],
      include: {
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
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[api/admin/orders][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger les ordres.");
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
        { error: "Ajoute au moins un parfum à l'ordre." },
        { status: 400 },
      );
    }

    const cleanItems: { perfumeId: number; quantity: number; note: string | null }[] = [];
    for (const raw of items) {
      const perfumeId = typeof raw.perfumeId === "number" ? raw.perfumeId : Number(raw.perfumeId);
      const quantity =
        typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity ?? 1);
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
      cleanItems.push({
        perfumeId: Math.floor(perfumeId),
        quantity: Math.floor(quantity),
        note: raw.note?.trim() || null,
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

    const deliveryAt =
      body.deliveryAt && body.deliveryAt.trim().length > 0 ? new Date(body.deliveryAt) : null;
    if (deliveryAt && Number.isNaN(deliveryAt.getTime())) {
      return NextResponse.json({ error: "Date de livraison invalide." }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        customerName: body.customerName?.trim() || null,
        deliveryAt,
        status,
        notes: body.notes?.trim() || null,
        items: {
          create: cleanItems,
        },
      },
      include: {
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
      },
    });

    await writeAudit(ctx.sub, "order.create", "Order", order.id, {
      itemCount: cleanItems.length,
      customerName: order.customerName,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[api/admin/orders][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible de créer l'ordre.");
  }
}
