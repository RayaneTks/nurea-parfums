"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js-light";
import { writeAudit } from "@/lib/admin/audit";
import { revalidateTag } from "next/cache";
import { tagFor } from "@/lib/admin/cache-tags";
import { paymentCreateSchema, paymentVoidSchema } from "@/schemas/payment";
import type { ActionResult } from "@/server/customers/actions";
import { computeOrderBalance } from "./payments";
import { canTransition } from "@/domain/order-status";
import { recordMovement, reverseMovementsFor } from "@/server/treasury/movements";
import { syncOrderPurchaseCost } from "@/server/orders/purchaseCost";
import type { OrderStatus } from "@prisma/client";

async function refreshOrderCache(orderId: string): Promise<void> {
  const balance = await computeOrderBalance(orderId);
  if (!balance) return;
  const depositTotal = new Decimal(balance.depositPaid).minus(balance.refunded);
  await prisma.order.update({
    where: { id: orderId },
    data: {
      depositPaid: depositTotal.greaterThan(0),
      depositAmount: depositTotal.greaterThan(0) ? depositTotal.toFixed(2) : "0.00",
    },
  });
}

export async function recordPaymentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; orderStatus: OrderStatus }>> {
  const parsed = paymentCreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Saisie invalide." };
  }
  const { orderId, type, amount, paidAt, method, note, pocketId } = parsed.data;
  const numAmount = Number(amount);
  if (numAmount <= 0) {
    return { ok: false, error: "Montant doit être > 0." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, items: { select: { unitPrice: true, quantity: true } } },
  });
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.status === "CANCELLED") {
    return { ok: false, error: "Commande annulée : aucun paiement possible." };
  }

  try {
    const payment = await prisma.paymentTransaction.create({
      data: {
        orderId,
        type,
        amount,
        paidAt: paidAt ?? new Date(),
        method: method ?? null,
        note: note ?? null,
      },
      select: { id: true },
    });

    await refreshOrderCache(orderId);

    // Mouvement de trésorerie : l'argent entre (acompte/solde) ou sort (refund) d'une poche.
    await recordMovement({
      pocketId: pocketId ?? null,
      amount,
      kind: type === "DEPOSIT" ? "DEPOSIT_IN" : type === "BALANCE" ? "BALANCE_IN" : "REFUND_OUT",
      label: type === "DEPOSIT" ? "Acompte" : type === "BALANCE" ? "Solde" : "Remboursement",
      refType: "PaymentTransaction",
      refId: payment.id,
      occurredAt: paidAt ?? new Date(),
    });

    // Auto-transition PENDING → READY au 1er DEPOSIT positif.
    let nextStatus: OrderStatus = order.status;
    if (order.status === "PENDING" && type === "DEPOSIT") {
      const balance = await computeOrderBalance(orderId);
      const total = balance ? Number(balance.total) : 0;
      const deposit = balance ? Number(balance.depositPaid) - Number(balance.refunded) : 0;
      const guard = canTransition("PENDING", "READY", {
        depositPaidTotal: deposit,
        balancePaidTotal: balance ? Number(balance.balancePaid) : 0,
        orderTotal: total,
        hasSale: false,
      });
      if (guard.ok) {
        await prisma.order.update({ where: { id: orderId }, data: { status: "READY" } });
        nextStatus = "READY";
        // La commande devient réelle → sortie « Coût d'achat » en trésorerie, dans la
        // même poche que l'acompte encaissé (à répartir si aucune).
        await syncOrderPurchaseCost(orderId, { pocketId: pocketId ?? null });
      }
    }

    await writeAudit(undefined, "order.payment.record", "Order", orderId, {
      paymentId: payment.id,
      type,
      amount,
    });

    revalidatePath(`/admin/ordres/${orderId}`);
    revalidatePath("/admin/ordres");
    revalidatePath("/admin");
    revalidateTag(tagFor.orders(), "default");
    revalidateTag(tagFor.order(orderId), "default");
    revalidateTag(tagFor.pipeline(), "default");
    revalidateTag(tagFor.treasury(), "default");
    return { ok: true, data: { id: payment.id, orderStatus: nextStatus } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
}

export async function voidPaymentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = paymentVoidSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { paymentId, reason } = parsed.data;

  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: paymentId },
    select: { id: true, orderId: true, type: true, amount: true },
  });
  if (!payment) return { ok: false, error: "Paiement introuvable." };

  try {
    // Annulation logique = REFUND inverse + delete original.
    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          orderId: payment.orderId,
          type: "REFUND",
          amount: payment.amount,
          note: reason
            ? `Annulation paiement ${payment.id}: ${reason}`
            : `Annulation paiement ${payment.id}`,
        },
      });
    });

    // Annule aussi le mouvement de trésorerie du paiement (l'argent ressort de la poche).
    await reverseMovementsFor("PaymentTransaction", paymentId);

    await refreshOrderCache(payment.orderId);
    await writeAudit(undefined, "order.payment.void", "Order", payment.orderId, {
      voidedPaymentId: paymentId,
    });
    revalidatePath(`/admin/ordres/${payment.orderId}`);
    revalidateTag(tagFor.treasury(), "default");
    return { ok: true, data: { id: paymentId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Annulation impossible." };
  }
}
