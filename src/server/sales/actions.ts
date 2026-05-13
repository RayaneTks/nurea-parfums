"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js-light";
import { writeAudit } from "@/lib/admin/audit";
import { revalidateTag } from "next/cache";
import { tagFor } from "@/lib/admin/cache-tags";
import { createSaleInputSchema, updateSaleInputSchema } from "@/schemas/sale";
import type { CreateSaleInput, SaleItemInput, UpdateSaleInput } from "@/schemas/sale";
import type { ActionResult } from "@/server/customers/actions";

type LineComputation = {
  perfumeId: number | null;
  perfumeSnapshot: object;
  quantity: number;
  volumeMl: number | null;
  unitPrice: string;
  unitCost: string;
  unitCostDzd: string | null;
  exchangeRate: string | null;
  lineRevenue: string;
  lineCost: string;
  lineMargin: string;
};

function computeLine(
  it: SaleItemInput,
  perfumeSnapshot: object,
): LineComputation {
  const price = new Decimal(it.unitPrice);
  const qty = it.quantity;
  const dzd = it.unitCostDzd && it.unitCostDzd !== "0" ? new Decimal(it.unitCostDzd) : null;
  const rate = it.exchangeRate && it.exchangeRate !== "0" ? new Decimal(it.exchangeRate) : null;
  const unitCost = dzd && rate && rate.greaterThan(0) ? dzd.dividedBy(rate) : new Decimal(0);
  const lineRevenue = price.times(qty);
  const lineCost = unitCost.times(qty);
  const lineMargin = lineRevenue.minus(lineCost);

  return {
    perfumeId: it.perfumeId,
    perfumeSnapshot,
    quantity: qty,
    volumeMl: it.volumeMl ?? null,
    unitPrice: price.toFixed(2),
    unitCost: unitCost.toFixed(2),
    unitCostDzd: dzd ? dzd.toFixed(2) : null,
    exchangeRate: rate ? rate.toFixed(2) : null,
    lineRevenue: lineRevenue.toFixed(2),
    lineCost: lineCost.toFixed(2),
    lineMargin: lineMargin.toFixed(2),
  };
}

export async function createSaleAction(
  input: CreateSaleInput,
): Promise<ActionResult<{ saleId: string }>> {
  const parsed = createSaleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const data = parsed.data;

  // Hydrate perfumeSnapshot serveur-side for each line.
  const perfumeIds = data.items
    .map((it) => it.perfumeId)
    .filter((id): id is number => id !== null);
  const perfumesFromDb =
    perfumeIds.length > 0
      ? await prisma.perfume.findMany({
          where: { id: { in: perfumeIds } },
          select: {
            id: true,
            name: true,
            image: true,
            brand: { select: { name: true } },
          },
        })
      : [];
  const byPerfumeId = new Map(perfumesFromDb.map((p) => [p.id, p]));

  const lines: LineComputation[] = data.items.map((it) => {
    let snapshot: object;
    if (it.perfumeId !== null) {
      const found = byPerfumeId.get(it.perfumeId);
      if (!found) throw new Error(`Parfum ${it.perfumeId} introuvable.`);
      snapshot = {
        id: found.id,
        name: found.name,
        image: found.image,
        brandName: found.brand.name,
      };
    } else {
      snapshot = (it.perfumeSnapshot ?? { name: "Hors catalogue", brandName: "—" }) as object;
    }
    return computeLine(it, snapshot);
  });

  const totalRevenue = lines.reduce<Decimal>(
    (acc, l) => acc.plus(new Decimal(l.lineRevenue)),
    new Decimal(0),
  );
  const totalCost = lines.reduce<Decimal>(
    (acc, l) => acc.plus(new Decimal(l.lineCost)),
    new Decimal(0),
  );
  const totalMargin = totalRevenue.minus(totalCost);

  try {
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Crée Sale + items avec snapshot.
      const created = await tx.sale.create({
        data: {
          orderId: data.orderId ?? null,
          customerId: data.customerId ?? null,
          customerName: data.customerName ?? null,
          soldAt: data.soldAt ?? new Date(),
          notes: data.notes ?? null,
          totalRevenue: totalRevenue.toFixed(2),
          totalCost: totalCost.toFixed(2),
          totalMargin: totalMargin.toFixed(2),
          items: {
            create: lines.map((l) => ({
              perfumeId: l.perfumeId,
              perfumeSnapshot: l.perfumeSnapshot,
              quantity: l.quantity,
              volumeMl: l.volumeMl,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              unitCostDzd: l.unitCostDzd,
              exchangeRate: l.exchangeRate,
              lineRevenue: l.lineRevenue,
              lineCost: l.lineCost,
              lineMargin: l.lineMargin,
            })),
          },
        },
        select: { id: true },
      });

      // 2. Si liée à une commande : transition Order → DELIVERED.
      if (data.orderId) {
        await tx.order.update({
          where: { id: data.orderId },
          data: { status: "DELIVERED" },
        });
      }

      return created;
    });

    await writeAudit(undefined, "sale.create", "Sale", sale.id, {
      orderId: data.orderId ?? null,
      totalRevenue: totalRevenue.toFixed(2),
      totalMargin: totalMargin.toFixed(2),
      itemCount: lines.length,
    });

    revalidatePath("/admin/compta");
    revalidatePath("/admin");
    revalidateTag(tagFor.sales(), "default");
    revalidateTag(tagFor.kpi(), "default");
    if (data.orderId) {
      revalidatePath("/admin/ordres");
      revalidatePath(`/admin/ordres/${data.orderId}`);
      revalidateTag(tagFor.orders(), "default");
      revalidateTag(tagFor.order(data.orderId), "default");
      revalidateTag(tagFor.pipeline(), "default");
    }
    return { ok: true, data: { saleId: sale.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Création vente impossible." };
  }
}

/**
 * Update d'une vente (customer name, items, totals recalculés serveur).
 *
 * Sécurité : tous les montants sont recalculés depuis (unitCostDzd / exchangeRate)
 * — pas de confiance dans `unitCost` envoyé par le client.
 */
export async function updateSaleAction(
  saleId: string,
  input: UpdateSaleInput,
): Promise<ActionResult<{ saleId: string }>> {
  const parsed = updateSaleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const data = parsed.data;

  const existing = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true, orderId: true },
  });
  if (!existing) return { ok: false, error: "Vente introuvable." };

  try {
    let totalRevenueStr: string | undefined;
    let totalCostStr: string | undefined;
    let totalMarginStr: string | undefined;
    let lines: LineComputation[] = [];

    if (data.items && data.items.length > 0) {
      const perfumeIds = data.items
        .map((it) => it.perfumeId)
        .filter((id): id is number => id !== null);
      const perfumesFromDb =
        perfumeIds.length > 0
          ? await prisma.perfume.findMany({
              where: { id: { in: perfumeIds } },
              select: {
                id: true,
                name: true,
                image: true,
                brand: { select: { name: true } },
              },
            })
          : [];
      const byPerfumeId = new Map(perfumesFromDb.map((p) => [p.id, p]));

      lines = data.items.map((it) => {
        let snapshot: object;
        if (it.perfumeId !== null) {
          const found = byPerfumeId.get(it.perfumeId);
          if (!found) throw new Error(`Parfum ${it.perfumeId} introuvable.`);
          snapshot = {
            id: found.id,
            name: found.name,
            image: found.image,
            brandName: found.brand.name,
          };
        } else {
          snapshot = (it.perfumeSnapshot ?? { name: "Hors catalogue", brandName: "—" }) as object;
        }
        return computeLine(it, snapshot);
      });

      const totalRevenue = lines.reduce<Decimal>(
        (acc, l) => acc.plus(new Decimal(l.lineRevenue)),
        new Decimal(0),
      );
      const totalCost = lines.reduce<Decimal>(
        (acc, l) => acc.plus(new Decimal(l.lineCost)),
        new Decimal(0),
      );
      const totalMargin = totalRevenue.minus(totalCost);
      totalRevenueStr = totalRevenue.toFixed(2);
      totalCostStr = totalCost.toFixed(2);
      totalMarginStr = totalMargin.toFixed(2);
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: saleId },
        data: {
          customerId: data.customerId === undefined ? undefined : data.customerId ?? null,
          customerName: data.customerName === undefined ? undefined : data.customerName ?? null,
          soldAt: data.soldAt ?? undefined,
          notes: data.notes === undefined ? undefined : data.notes ?? null,
          ...(totalRevenueStr ? { totalRevenue: totalRevenueStr } : {}),
          ...(totalCostStr ? { totalCost: totalCostStr } : {}),
          ...(totalMarginStr ? { totalMargin: totalMarginStr } : {}),
        },
      });

      if (data.items && data.items.length > 0 && lines.length > 0) {
        await tx.saleItem.deleteMany({ where: { saleId } });
        await tx.saleItem.createMany({
          data: lines.map((l) => ({
            saleId,
            perfumeId: l.perfumeId,
            perfumeSnapshot: l.perfumeSnapshot,
            quantity: l.quantity,
            volumeMl: l.volumeMl,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            unitCostDzd: l.unitCostDzd,
            exchangeRate: l.exchangeRate,
            lineRevenue: l.lineRevenue,
            lineCost: l.lineCost,
            lineMargin: l.lineMargin,
          })),
        });
      }
    });

    await writeAudit(undefined, "sale.update", "Sale", saleId, {
      orderId: existing.orderId ?? null,
      itemCount: data.items?.length ?? null,
    });

    revalidatePath("/admin/compta");
    revalidatePath("/admin");
    revalidateTag(tagFor.sales(), "default");
    revalidateTag(tagFor.kpi(), "default");
    if (existing.orderId) revalidatePath(`/admin/ordres/${existing.orderId}`);
    return { ok: true, data: { saleId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mise à jour vente impossible." };
  }
}

export async function deleteSaleAction(saleId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { id: true, orderId: true },
    });
    if (!sale) return { ok: false, error: "Vente introuvable." };

    await prisma.$transaction(async (tx) => {
      await tx.sale.delete({ where: { id: saleId } });
      // Si liée à une commande, rebascule en READY (admin peut re-facturer).
      if (sale.orderId) {
        await tx.order.update({
          where: { id: sale.orderId },
          data: { status: "READY" },
        });
      }
    });

    await writeAudit(undefined, "sale.delete", "Sale", saleId);
    revalidatePath("/admin/compta");
    if (sale.orderId) revalidatePath(`/admin/ordres/${sale.orderId}`);
    return { ok: true, data: { id: saleId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

// Pure helper exported for test (sans Prisma).
export function _computeSaleTotals(items: readonly SaleItemInput[]): {
  totalRevenue: string;
  totalCost: string;
  totalMargin: string;
} {
  const lines = items.map((it) => computeLine(it, {}));
  const totalRevenue = lines.reduce<Decimal>(
    (acc, l) => acc.plus(new Decimal(l.lineRevenue)),
    new Decimal(0),
  );
  const totalCost = lines.reduce<Decimal>(
    (acc, l) => acc.plus(new Decimal(l.lineCost)),
    new Decimal(0),
  );
  const totalMargin = totalRevenue.minus(totalCost);
  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalCost: totalCost.toFixed(2),
    totalMargin: totalMargin.toFixed(2),
  };
}
