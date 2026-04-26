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
  id?: string;
  perfumeId?: number;
  quantity?: number;
  note?: string | null;
};

type UpdateOrderBody = {
  customerName?: string | null;
  deliveryAt?: string | null;
  status?: OrderStatus;
  notes?: string | null;
  items?: OrderItemInput[];
};

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      return NextResponse.json({ error: "Ordre introuvable." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[api/admin/orders/[id]][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger l'ordre.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id } = await params;

    let body: UpdateOrderBody;
    try {
      body = (await request.json()) as UpdateOrderBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, sale: { select: { id: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ordre introuvable." }, { status: 404 });
    }

    const hasSale = !!existing.sale;

    const data: Record<string, unknown> = {};

    if ("customerName" in body) {
      data.customerName = body.customerName?.trim() || null;
    }

    if ("notes" in body) {
      data.notes = body.notes?.trim() || null;
    }

    if ("status" in body && body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
      }
      data.status = body.status;
    }

    if ("deliveryAt" in body) {
      const value = body.deliveryAt;
      if (value === null || value === "") {
        data.deliveryAt = null;
      } else if (value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "Date de livraison invalide." }, { status: 400 });
        }
        data.deliveryAt = d;
      }
    }

    if ("items" in body && Array.isArray(body.items)) {
      if (hasSale) {
        return NextResponse.json(
          { error: "Les items ne peuvent plus être modifiés : une vente est liée à cet ordre." },
          { status: 409 },
        );
      }
      if (body.items.length === 0) {
        return NextResponse.json(
          { error: "L'ordre doit contenir au moins un parfum." },
          { status: 400 },
        );
      }
      const cleanItems: { perfumeId: number; quantity: number; note: string | null }[] = [];
      for (const raw of body.items) {
        const perfumeId =
          typeof raw.perfumeId === "number" ? raw.perfumeId : Number(raw.perfumeId);
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

      data.items = {
        deleteMany: {},
        create: cleanItems,
      };
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Aucun champ à mettre à jour." },
        { status: 400 },
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: orderInclude,
    });

    await writeAudit(ctx.sub, "order.update", "Order", id, {
      fields: Object.keys(data),
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("[api/admin/orders/[id]][PATCH]", error);
    return jsonFromPrismaGestionError(error, "Impossible de mettre à jour l'ordre.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, sale: { select: { id: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ordre introuvable." }, { status: 404 });
    }

    if (existing.sale) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer : une vente est déjà liée à cet ordre. Supprime d'abord la vente ou garde l'ordre en historique.",
        },
        { status: 409 },
      );
    }

    await prisma.order.delete({ where: { id } });
    await writeAudit(ctx.sub, "order.delete", "Order", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/orders/[id]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer l'ordre.");
  }
}
