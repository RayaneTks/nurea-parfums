import { NextResponse } from "next/server";
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { serializeOrder } from "@/lib/gestion/orderJson";
import { purgeOrderIfEphemeral } from "@/lib/gestion/orderPurge";
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
  id?: string;
  perfumeId?: number;
  quantity?: number;
  note?: string | null;
  volumeMl?: number;
  unitPrice?: number | string;
  unitCost?: number | string;
};

type UpdateOrderBody = {
  customerName?: string | null;
  deliveryAt?: string | null;
  status?: OrderStatus;
  notes?: string | null;
  depositPaid?: boolean;
  depositAmount?: number | string | null;
  items?: OrderItemInput[];
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const removed = await purgeOrderIfEphemeral(prisma, id);
    if (removed) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    console.error("[api/admin/orders/[id]][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger la commande.");
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
      select: {
        id: true,
        sale: { select: { id: true } },
        status: true,
        depositPaid: true,
        depositAmount: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const hasSale = !!existing.sale;

    const data: Prisma.OrderUpdateInput = {};

    if ("customerName" in body) {
      data.customerName = body.customerName?.trim() || null;
    }

    if ("notes" in body) {
      data.notes = body.notes?.trim() || null;
    }

    if ("depositPaid" in body) {
      const nextPaid = Boolean(body.depositPaid);
      data.depositPaid = nextPaid;
      if (nextPaid === false) {
        if (!("depositAmount" in body)) {
          data.depositAmount = new Prisma.Decimal(0);
        }
        if (existing.status === OrderStatus.READY) {
          data.status = OrderStatus.PENDING;
        }
      }
    }

    if ("depositAmount" in body) {
      const d = parseOptionalMoneyToZero(body.depositAmount);
      if (d === null) {
        return NextResponse.json(
          { error: "Montant d'acompte invalide (nombre ≥ 0 ou vide pour 0 €)." },
          { status: 400 },
        );
      }
      data.depositAmount = new Prisma.Decimal(d);
    }

    if ("status" in body && body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
      }
      if (body.status === OrderStatus.CANCELLED) {
        return NextResponse.json(
          {
            error:
              "Les commandes annulées ne sont pas conservées : utilise « Supprimer la commande » sur la fiche.",
          },
          { status: 400 },
        );
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
          { error: "Les items ne peuvent plus être modifiés : une vente est liée à cette commande." },
          { status: 409 },
        );
      }
      if (body.items.length === 0) {
        return NextResponse.json(
          { error: "La commande doit contenir au moins un parfum." },
          { status: 400 },
        );
      }
      const cleanItems: {
        perfumeId: number;
        quantity: number;
        note: string | null;
        volumeMl: number;
        unitPrice: Prisma.Decimal;
        unitCost: Prisma.Decimal;
      }[] = [];
      for (const raw of body.items) {
        const perfumeId =
          typeof raw.perfumeId === "number" ? raw.perfumeId : Number(raw.perfumeId);
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
            { error: "Prix client invalide sur une ligne." },
            { status: 400 },
          );
        }
        if (uc === null) {
          return NextResponse.json(
            { error: "Prix d'achat (ton coût) invalide sur une ligne." },
            { status: 400 },
          );
        }
        cleanItems.push({
          perfumeId: Math.floor(perfumeId),
          quantity: Math.floor(quantity),
          note: raw.note?.trim() || null,
          volumeMl: vol,
          unitPrice: new Prisma.Decimal(up),
          unitCost: new Prisma.Decimal(uc),
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

    const nextDepositPaid = "depositPaid" in data ? Boolean(data.depositPaid) : existing.depositPaid;
    const nextDepositAmount: Prisma.Decimal =
      "depositAmount" in data
        ? (data.depositAmount as Prisma.Decimal)
        : (existing.depositAmount as Prisma.Decimal);
    const nextAmtNum = Number(nextDepositAmount);
    if (nextDepositPaid && nextAmtNum <= 0) {
      return NextResponse.json(
        {
          error:
            "Indique le montant d’acompte (supérieur à 0 €) pour enregistrer l’acompte payé, ou remets l’acompte en attente.",
        },
        { status: 400 },
      );
    }

    const mergedPaidForStatus =
      "depositPaid" in data ? Boolean(data.depositPaid) : existing.depositPaid;
    const mergedAmtForStatus = Number("depositAmount" in data ? data.depositAmount : existing.depositAmount);
    if ("status" in data && (data as { status?: OrderStatus }).status === OrderStatus.READY) {
      if (!mergedPaidForStatus || mergedAmtForStatus <= 0) {
        return NextResponse.json(
          {
            error:
              "Acompte reçu (montant > 0 €) requis pour passer en « à traiter ».",
          },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: orderInclude,
    });

    await writeAudit(ctx.sub, "order.update", "Order", id, {
      fields: Object.keys(data),
    });

    return NextResponse.json({ order: serializeOrder(updated) });
  } catch (error) {
    console.error("[api/admin/orders/[id]][PATCH]", error);
    return jsonFromPrismaGestionError(error, "Impossible de mettre à jour la commande.");
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
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    await prisma.order.delete({ where: { id } });
    await writeAudit(ctx.sub, "order.delete", "Order", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/orders/[id]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer la commande.");
  }
}
