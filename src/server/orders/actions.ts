"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js-light";
import { writeAudit } from "@/lib/admin/audit";
import { createOrderInputSchema } from "@/schemas/order";
import type { CreateOrderInput } from "@/schemas/order";
import type { ActionResult } from "@/server/customers/actions";

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
        await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            type: "DEPOSIT",
            amount: depositAmountStr,
            method: data.initialDeposit?.method ?? null,
            note: "Acompte initial à la création",
          },
        });
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
    return { ok: true, data: { id: created.id, status: created.status as "PENDING" | "READY" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Création impossible." };
  }
}
