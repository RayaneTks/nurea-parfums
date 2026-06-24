import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { serializeOrder } from "@/lib/gestion/orderJson";
import { deriveFulfillment } from "@/domain/order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

type FulfillmentItemInput = { id?: string; deliveredQuantity?: number };
type FulfillmentBody = { items?: FulfillmentItemInput[] };

/**
 * Met à jour la quantité livrée par ligne (livraison partielle).
 *
 * PATCH body : { items: [{ id, deliveredQuantity }] }
 * - Garde : éditeur requis ; commande figée si vente liée ou annulée.
 * - Clamp serveur : 0 <= deliveredQuantity <= quantity (jamais confiance au client).
 */
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

    let body: FulfillmentBody;
    try {
      body = (await request.json()) as FulfillmentBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne à mettre à jour." },
        { status: 400 },
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        sale: { select: { id: true } },
        items: { select: { id: true, quantity: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    if (existing.sale) {
      return NextResponse.json(
        { error: "Livraison figée : une vente est liée à cette commande." },
        { status: 409 },
      );
    }
    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Commande annulée : livraison non modifiable." },
        { status: 409 },
      );
    }

    const byId = new Map(existing.items.map((it) => [it.id, it.quantity]));
    const updates: { id: string; deliveredQuantity: number }[] = [];
    for (const raw of body.items) {
      if (!raw.id || !byId.has(raw.id)) {
        return NextResponse.json(
          { error: "Une des lignes n'appartient pas à cette commande." },
          { status: 400 },
        );
      }
      const max = byId.get(raw.id)!;
      const requested =
        typeof raw.deliveredQuantity === "number"
          ? raw.deliveredQuantity
          : Number(raw.deliveredQuantity ?? 0);
      if (!Number.isFinite(requested)) {
        return NextResponse.json(
          { error: "Quantité livrée invalide." },
          { status: 400 },
        );
      }
      const clamped = Math.max(0, Math.min(Math.floor(requested), max));
      updates.push({ id: raw.id, deliveredQuantity: clamped });
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.orderItem.update({
          where: { id: u.id },
          data: { deliveredQuantity: u.deliveredQuantity },
        }),
      ),
    );

    const updated = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!updated) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    await writeAudit(ctx.sub, "order.fulfillment", "Order", id, {
      items: updates.length,
    });

    return NextResponse.json({
      order: serializeOrder(updated),
      fulfillment: deriveFulfillment(updated.items),
    });
  } catch (error) {
    console.error("[api/admin/orders/[id]/fulfillment][PATCH]", error);
    return jsonFromPrismaGestionError(error, "Impossible de mettre à jour la livraison.");
  }
}
