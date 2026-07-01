"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js-light";
import { writeAudit } from "@/lib/admin/audit";
import { revalidateTag } from "next/cache";
import { tagFor } from "@/lib/admin/cache-tags";
import { createOrderInputSchema, updateOrderInputSchema } from "@/schemas/order";
import type { CreateOrderInput, UpdateOrderInput } from "@/schemas/order";
import type { ActionResult } from "@/server/customers/actions";
import { recordMovement } from "@/server/treasury/movements";

function lineUnitCostEur(unitCostDzd: string | null, exchangeRate: string | null): string {
  if (!unitCostDzd || !exchangeRate) return "0";
  const d = new Decimal(unitCostDzd);
  const r = new Decimal(exchangeRate);
  if (r.isZero()) return "0";
  return d.dividedBy(r).toFixed(2);
}

function lineTotalEur(unitPrice: string, qty: number): Decimal {
  return new Decimal(unitPrice).times(qty);
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<ActionResult<{ id: string; status: "PENDING" | "READY" }>> {
  const parsed = createOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Saisie invalide." };
  }
  const data = parsed.data;

  // Total commande pour clamp deposit + statut auto-transition.
  const orderTotal = data.items.reduce<Decimal>(
    (acc, it) => acc.plus(lineTotalEur(it.unitPrice, it.quantity)),
    new Decimal(0),
  );

  const depositAmountStr =
    data.initialDeposit && Number(data.initialDeposit.amount) > 0
      ? new Decimal(data.initialDeposit.amount).toFixed(2)
      : "0.00";
  const depositPaid = new Decimal(depositAmountStr).greaterThan(0);
  const initialStatus = depositPaid ? "READY" : "PENDING";

  try {
    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: data.customerId ?? null,
          customerName: data.customerName,
          deliveryAt: data.deliveryAt ?? null,
          notes: data.notes ?? null,
          status: initialStatus,
          depositPaid,
          depositAmount: depositAmountStr,
          items: {
            create: data.items.map((it) => ({
              perfumeId: it.perfumeId ?? null,
              perfumeSnapshot:
                it.perfumeId === null && it.perfumeSnapshot
                  ? (it.perfumeSnapshot as object)
                  : undefined,
              quantity: it.quantity,
              volumeMl: it.volumeMl,
              isGift: it.isGift ?? false,
              unitPrice: new Decimal(it.unitPrice).toFixed(2),
              unitCost: lineUnitCostEur(it.unitCostDzd, it.exchangeRate),
              unitCostDzd:
                it.unitCostDzd && it.unitCostDzd !== "0"
                  ? new Decimal(it.unitCostDzd).toFixed(2)
                  : null,
              exchangeRate:
                it.exchangeRate && it.exchangeRate !== "0"
                  ? new Decimal(it.exchangeRate).toFixed(2)
                  : null,
              note: it.note ?? null,
            })),
          },
        },
        select: { id: true, status: true },
      });

      if (depositPaid) {
        const payment = await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            type: "DEPOSIT",
            amount: depositAmountStr,
            method: data.initialDeposit?.method ?? null,
            note: "Acompte initial à la création",
          },
          select: { id: true },
        });
        // Trésorerie : l'acompte entre réellement dans une poche (ou « Non attribué »).
        // Source de vérité unique = PaymentTransaction ; le mouvement la référence.
        await recordMovement(
          {
            pocketId: data.initialDeposit?.pocketId ?? null,
            amount: depositAmountStr,
            kind: "DEPOSIT_IN",
            label: "Acompte",
            refType: "PaymentTransaction",
            refId: payment.id,
          },
          tx,
        );
      }

      // PerfumePricing upsert : "smart memory" serveur — chaque ligne fixe le prix
      // par défaut pour (perfume, volume) si non encore renseigné.
      for (const it of data.items) {
        if (it.perfumeId === null) continue;
        const priceStr = new Decimal(it.unitPrice).toFixed(2);
        const dzdStr =
          it.unitCostDzd && it.unitCostDzd !== "0"
            ? new Decimal(it.unitCostDzd).toFixed(2)
            : null;
        await tx.perfumePricing.upsert({
          where: { perfumeId_volumeMl: { perfumeId: it.perfumeId, volumeMl: it.volumeMl } },
          update: {},
          create: {
            perfumeId: it.perfumeId,
            volumeMl: it.volumeMl,
            defaultUnitPriceEur: priceStr,
            defaultUnitCostDzd: dzdStr,
          },
        });
      }

      return order;
    });

    await writeAudit(undefined, "order.create", "Order", created.id, {
      itemCount: data.items.length,
      total: orderTotal.toFixed(2),
      depositPaid,
    });

    revalidatePath("/admin/ordres");
    revalidatePath("/admin");
    revalidateTag(tagFor.orders(), "default");
    revalidateTag(tagFor.pipeline(), "default");
    revalidateTag(tagFor.kpi(), "default");
    if (depositPaid) revalidateTag(tagFor.treasury(), "default");
    return { ok: true, data: { id: created.id, status: created.status as "PENDING" | "READY" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Création impossible." };
  }
}

export async function updateOrderAction(
  orderId: string,
  input: UpdateOrderInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true } });
      if (!order) throw new Error("Commande introuvable.");

      // Update champs scalaires.
      await tx.order.update({
        where: { id: orderId },
        data: {
          customerId: data.customerId === undefined ? undefined : data.customerId ?? null,
          customerName: data.customerName,
          deliveryAt: data.deliveryAt === undefined ? undefined : data.deliveryAt ?? null,
          notes: data.notes === undefined ? undefined : data.notes ?? null,
          status: data.status,
        },
      });

      // Replace items si fournis (full replace). Drop puis recreate.
      if (data.items && data.items.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId } });
        await tx.orderItem.createMany({
          data: data.items.map((it) => ({
            orderId,
            perfumeId: it.perfumeId ?? null,
            perfumeSnapshot:
              it.perfumeId === null && it.perfumeSnapshot ? (it.perfumeSnapshot as object) : undefined,
            quantity: it.quantity,
            volumeMl: it.volumeMl,
            isGift: it.isGift ?? false,
            unitPrice: new Decimal(it.unitPrice).toFixed(2),
            unitCost: lineUnitCostEur(it.unitCostDzd, it.exchangeRate),
            unitCostDzd:
              it.unitCostDzd && it.unitCostDzd !== "0"
                ? new Decimal(it.unitCostDzd).toFixed(2)
                : null,
            exchangeRate:
              it.exchangeRate && it.exchangeRate !== "0"
                ? new Decimal(it.exchangeRate).toFixed(2)
                : null,
            note: it.note ?? null,
          })),
        });

        // Smart pricing memory upsert.
        for (const it of data.items) {
          if (it.perfumeId === null) continue;
          await tx.perfumePricing.upsert({
            where: { perfumeId_volumeMl: { perfumeId: it.perfumeId, volumeMl: it.volumeMl } },
            update: {},
            create: {
              perfumeId: it.perfumeId,
              volumeMl: it.volumeMl,
              defaultUnitPriceEur: new Decimal(it.unitPrice).toFixed(2),
              defaultUnitCostDzd:
                it.unitCostDzd && it.unitCostDzd !== "0"
                  ? new Decimal(it.unitCostDzd).toFixed(2)
                  : null,
            },
          });
        }
      }
    });

    await writeAudit(undefined, "order.update", "Order", orderId);
    revalidatePath("/admin/ordres");
    revalidatePath(`/admin/ordres/${orderId}`);
    revalidateTag(tagFor.orders(), "default");
    revalidateTag(tagFor.order(orderId), "default");
    revalidateTag(tagFor.pipeline(), "default");
    return { ok: true, data: { id: orderId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mise à jour impossible." };
  }
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
    await writeAudit(undefined, "order.cancel", "Order", orderId);
    revalidatePath("/admin/ordres");
    revalidatePath(`/admin/ordres/${orderId}`);
    return { ok: true, data: { id: orderId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Annulation impossible." };
  }
}

/**
 * Réassort : duplique une commande existante en une nouvelle commande PENDING
 * (mêmes articles + client, sans paiements ni livraison). Réutilise createOrderAction.
 */
export async function duplicateOrderAction(
  orderId: string,
): Promise<ActionResult<{ id: string; status: "PENDING" | "READY" }>> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      customerId: true,
      customerName: true,
      customer: { select: { fullName: true } },
      items: {
        select: {
          perfumeId: true,
          perfumeSnapshot: true,
          quantity: true,
          volumeMl: true,
          unitPrice: true,
          unitCostDzd: true,
          exchangeRate: true,
          isGift: true,
          note: true,
        },
      },
    },
  });
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.items.length === 0) return { ok: false, error: "Commande sans article." };

  const items = order.items.map((it) => {
    const snap = it.perfumeSnapshot as { name?: string; brandName?: string; image?: string } | null;
    return {
      perfumeId: it.perfumeId,
      perfumeSnapshot:
        it.perfumeId === null && snap
          ? {
              name: snap.name ?? "Hors catalogue",
              brandName: snap.brandName ?? "Hors catalogue",
              image: snap.image ?? null,
            }
          : null,
      quantity: it.quantity,
      volumeMl: it.volumeMl as 30 | 50 | 100,
      unitPrice: it.unitPrice.toString(),
      unitCostDzd: it.unitCostDzd?.toString() ?? "0",
      exchangeRate: it.exchangeRate?.toString() ?? "0",
      isGift: it.isGift,
      note: it.note,
    };
  });

  return createOrderAction({
    customerId: order.customerId,
    customerName: order.customer?.fullName ?? order.customerName ?? "Client",
    deliveryAt: null,
    notes: null,
    items,
    initialDeposit: null,
  });
}
