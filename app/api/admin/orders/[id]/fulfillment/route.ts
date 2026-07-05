import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { serializeOrder } from "@/lib/gestion/orderJson";
import { deriveFulfillment } from "@/domain/order-status";
import { computeBalance } from "@/domain/balance";
import { recordMovement } from "@/server/treasury/movements";
import { tagFor } from "@/lib/admin/cache-tags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Libellé/méthode des soldes encaissés automatiquement à la livraison d'un flacon. */
const DELIVERY_PAYMENT_METHOD = "Livraison";

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
type FulfillmentBody = {
  items?: FulfillmentItemInput[];
  /** Poche où entre l'argent encaissé à la livraison (null → « Non attribué »). */
  pocketId?: string | null;
};

/**
 * Met à jour la quantité livrée par ligne (livraison partielle).
 *
 * PATCH body : { items: [{ id, deliveredQuantity }], pocketId? }
 * - Garde : éditeur requis ; commande figée si vente liée ou annulée.
 * - Clamp serveur : 0 <= deliveredQuantity <= quantity (jamais confiance au client).
 * - Encaissement automatique : livrer un flacon = récupérer son argent. Toute HAUSSE
 *   de quantité livrée encaisse `min(valeur des flacons livrés en plus, reste dû)` en
 *   « Solde » (méthode « Livraison ») dans la poche choisie, + mouvement de trésorerie.
 *   Le plafond « reste dû » respecte un éventuel acompte et empêche tout sur-encaissement ;
 *   une BAISSE ne rembourse pas (l'argent reste — annulable via le panneau Solde), et
 *   ré-augmenter n'encaisse au plus que le reste dû → jamais de double comptage.
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
        items: {
          select: {
            id: true,
            quantity: true,
            deliveredQuantity: true,
            unitPrice: true,
            isGift: true,
          },
        },
        payments: { select: { type: true, amount: true } },
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

    const byId = new Map(existing.items.map((it) => [it.id, it]));
    const updates: { id: string; deliveredQuantity: number }[] = [];
    for (const raw of body.items) {
      if (!raw.id || !byId.has(raw.id)) {
        return NextResponse.json(
          { error: "Une des lignes n'appartient pas à cette commande." },
          { status: 400 },
        );
      }
      const max = byId.get(raw.id)!.quantity;
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

    // Valeur des flacons livrés EN PLUS (hausse de quantité livrée, hors cadeaux).
    let increaseValue = 0;
    for (const u of updates) {
      const line = byId.get(u.id)!;
      const delta = u.deliveredQuantity - line.deliveredQuantity;
      if (delta > 0 && !line.isGift) {
        increaseValue += Number(line.unitPrice) * delta;
      }
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.orderItem.update({
          where: { id: u.id },
          data: { deliveredQuantity: u.deliveredQuantity },
        }),
      ),
    );

    // Encaissement automatique : plafonné au reste dû (respecte l'acompte, jamais de
    // sur-encaissement). Une baisse ne rembourse pas ; ré-augmenter n'encaisse au plus
    // que ce qui reste dû → aucun double comptage.
    let collected = 0;
    if (increaseValue > 0.005) {
      const balance = computeBalance(
        existing.items.map((it) => ({ unitPrice: it.unitPrice.toString(), quantity: it.quantity })),
        existing.payments.map((p) => ({ type: p.type, amount: p.amount.toString() })),
      );
      const due = Number(balance.due);
      const collect = Math.min(increaseValue, Math.max(0, due));
      if (collect > 0.005) {
        const amountStr = collect.toFixed(2);
        const payment = await prisma.paymentTransaction.create({
          data: {
            orderId: id,
            type: "BALANCE",
            amount: amountStr,
            paidAt: new Date(),
            method: DELIVERY_PAYMENT_METHOD,
          },
          select: { id: true },
        });
        await recordMovement({
          pocketId: body.pocketId ?? null,
          amount: amountStr,
          kind: "BALANCE_IN",
          label: "Solde",
          refType: "PaymentTransaction",
          refId: payment.id,
        });
        collected = collect;
      }
    }

    const updated = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!updated) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    await writeAudit(ctx.sub, "order.fulfillment", "Order", id, {
      items: updates.length,
      collected,
    });

    if (collected > 0) {
      revalidateTag(tagFor.treasury(), "default");
      revalidateTag(tagFor.orders(), "default");
      revalidateTag(tagFor.order(id), "default");
      revalidateTag(tagFor.pipeline(), "default");
    }

    return NextResponse.json({
      order: serializeOrder(updated),
      fulfillment: deriveFulfillment(updated.items),
      collected,
    });
  } catch (error) {
    console.error("[api/admin/orders/[id]/fulfillment][PATCH]", error);
    return jsonFromPrismaGestionError(error, "Impossible de mettre à jour la livraison.");
  }
}
