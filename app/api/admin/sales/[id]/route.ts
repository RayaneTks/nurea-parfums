import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { computeLineTotals, sumSaleTotals } from "@/lib/gestion/calculations";
import { isValidVolumeMl, parseMoneyField } from "@/lib/gestion/orderLineValidation";
import { getSaleById } from "@/server/sales/queries";
import { reverseMovementsFor } from "@/server/treasury/movements";
import { SALE_COST_REF } from "@/server/orders/purchaseCost";
import { revalidateTag } from "next/cache";
import { tagFor } from "@/lib/admin/cache-tags";
import { revalidateAdminCatalogue } from "@/lib/admin/revalidateAdminCatalogue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const sale = await getSaleById(id);

    if (!sale) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error("[api/admin/sales/[id]][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger la vente.");
  }
}

type PatchSaleItemBody = {
  id: string;
  unitPrice?: number | string;
  unitCost?: number | string;
  unitCostDzd?: number | string | null;
  exchangeRate?: number | string | null;
  quantity?: number;
  volumeMl?: number;
};

type NewSaleItemBody = {
  perfumeId: number | null;
  snapshot: { name: string; brandName: string | null; image?: string | null };
  quantity: number;
  volumeMl?: number | null;
  unitPrice: number | string;
  unitCostDzd?: number | string | null;
  exchangeRate?: number | string | null;
};

type PatchSaleBody = {
  customerId?: string | null;
  customerName?: string | null;
  customerContact?: string | null;
  notes?: string | null;
  remainingDue?: number | string | null;
  batchId?: string | null;
  items?: PatchSaleItemBody[];
  newItems?: NewSaleItemBody[];
  removeItemIds?: string[];
};

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

    let body: PatchSaleBody;
    try {
      body = (await request.json()) as PatchSaleBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const hasItems = Array.isArray(body.items) && body.items.length > 0;
    const hasNewItems = Array.isArray(body.newItems) && body.newItems.length > 0;
    const hasRemoveIds = Array.isArray(body.removeItemIds) && body.removeItemIds.length > 0;
    const hasNotes = "notes" in body;
    const hasCustomerName = "customerName" in body;
    const hasCustomerContact = "customerContact" in body;
    const hasCustomerId = "customerId" in body;
    const hasCustomer = hasCustomerName || hasCustomerId || hasCustomerContact;
    const hasRemainingDue = "remainingDue" in body;
    const hasBatch = "batchId" in body;
    if (!hasItems && !hasNewItems && !hasRemoveIds && !hasNotes && !hasCustomer && !hasRemainingDue && !hasBatch) {
      return NextResponse.json(
        { error: "Rien à mettre à jour." },
        { status: 400 },
      );
    }

    if (hasCustomerId && body.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: body.customerId },
        select: { id: true },
      });
      if (!customer) {
        return NextResponse.json(
          { error: "Client introuvable." },
          { status: 400 },
        );
      }
    }

    if (hasBatch && body.batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: body.batchId },
        select: { id: true },
      });
      if (!batch) {
        return NextResponse.json({ error: "Lot introuvable." }, { status: 400 });
      }
    }

    const existing = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    const byId = new Map(existing.items.map((i) => [i.id, i]));

    if (hasItems) {
      for (const p of body.items!) {
        if (!byId.has(p.id)) {
          return NextResponse.json(
            { error: "Une des lignes n'appartient pas à cette vente." },
            { status: 400 },
          );
        }
      }
      for (const p of body.items!) {
        const item = byId.get(p.id)!;
        const q =
          p.quantity === undefined
            ? item.quantity
            : Math.max(1, Math.floor(Number(p.quantity)));
        if (!Number.isFinite(q) || q < 1) {
          return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
        }

        const upRaw = p.unitPrice === undefined ? item.unitPrice.toString() : p.unitPrice;
        const upN = parseMoneyField(upRaw);
        if (upN === null) {
          return NextResponse.json(
            { error: "Prix invalide sur une ligne." },
            { status: 400 },
          );
        }
        if (p.unitCost !== undefined && parseMoneyField(p.unitCost) === null) {
          return NextResponse.json(
            { error: "Coût invalide sur une ligne." },
            { status: 400 },
          );
        }

        const volRaw =
          p.volumeMl === undefined
            ? item.volumeMl
            : Number(p.volumeMl);
        const volIn =
          volRaw === null || volRaw === undefined
            ? 100
            : volRaw;
        if (!isValidVolumeMl(volIn)) {
          return NextResponse.json(
            { error: "Volume invalide (30, 50 ou 100 ml)." },
            { status: 400 },
          );
        }
      }
    }

    let remainingDueN = 0;
    if (hasRemainingDue) {
      const raw = body.remainingDue;
      remainingDueN =
        raw === null || raw === undefined || raw === ""
          ? 0
          : Number(String(raw).replace(",", "."));
      if (!Number.isFinite(remainingDueN) || remainingDueN < 0) {
        return NextResponse.json(
          { error: "Reste à payer invalide (doit être ≥ 0)." },
          { status: 400 },
        );
      }
      if (remainingDueN > Number(existing.totalRevenue)) {
        return NextResponse.json(
          { error: "Reste à payer ne peut pas dépasser le total de la vente." },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (hasNotes || hasCustomer || hasRemainingDue || hasBatch) {
        const saleData: Prisma.SaleUpdateInput = {};
        if (hasNotes) saleData.notes = body.notes?.trim() || null;
        if (hasCustomerId) {
          if (body.customerId) {
            saleData.customer = { connect: { id: body.customerId } };
          } else {
            saleData.customer = { disconnect: true };
          }
        }
        if (hasCustomerName) {
          saleData.customerName = body.customerName?.trim() || null;
        }
        if (hasCustomerContact) {
          saleData.customerContact = body.customerContact?.trim() || null;
        }
        if (hasRemainingDue) {
          saleData.remainingDue = new Prisma.Decimal(remainingDueN);
        }
        if (hasBatch) {
          if (body.batchId) {
            saleData.batch = { connect: { id: body.batchId } };
          } else {
            saleData.batch = { disconnect: true };
          }
        }
        await tx.sale.update({ where: { id }, data: saleData });
      }

      if (hasRemoveIds) {
        await tx.saleItem.deleteMany({
          where: { id: { in: body.removeItemIds! }, saleId: id },
        });
      }

      if (hasItems) {
        for (const p of body.items!) {
          const item = byId.get(p.id)!;
          const q =
            p.quantity === undefined
              ? item.quantity
              : Math.max(1, Math.floor(Number(p.quantity)));

          const upRaw = p.unitPrice === undefined ? item.unitPrice.toString() : p.unitPrice;
          const upN = parseMoneyField(upRaw)!;

          const volRaw =
            p.volumeMl === undefined
              ? item.volumeMl
              : Number(p.volumeMl);
          const volIn =
            volRaw === null || volRaw === undefined
              ? 100
              : volRaw;

          const ucdRaw = p.unitCostDzd === undefined ? item.unitCostDzd : p.unitCostDzd;
          const exRaw = p.exchangeRate === undefined ? item.exchangeRate : p.exchangeRate;
          const ucdN = ucdRaw !== null && ucdRaw !== undefined ? Number(ucdRaw) : null;
          const exN = exRaw !== null && exRaw !== undefined ? Number(exRaw) : null;

          let coN: number;
          if (p.unitCost !== undefined) {
            coN = parseMoneyField(p.unitCost)!;
          } else if (ucdN !== null && exN !== null && Number.isFinite(ucdN) && Number.isFinite(exN) && exN > 0) {
            coN = ucdN / exN;
          } else {
            coN = parseMoneyField(item.unitCost.toString())!;
          }

          const totals = computeLineTotals({
            quantity: q,
            unitPrice: upN,
            unitCost: coN,
          });

          const snap = item.perfumeSnapshot;
          const baseObj =
            typeof snap === "object" && snap !== null && !Array.isArray(snap)
              ? (snap as Record<string, unknown>)
              : { name: "Ligne" };
          const newSnap: Prisma.InputJsonValue = {
            ...baseObj,
            volumeMl: volIn,
          };

          await tx.saleItem.update({
            where: { id: p.id },
            data: {
              quantity: q,
              volumeMl: volIn,
              unitPrice: totals.unitPrice,
              unitCost: totals.unitCost,
              unitCostDzd: ucdN !== null && Number.isFinite(ucdN) ? new Prisma.Decimal(ucdN) : null,
              exchangeRate: exN !== null && Number.isFinite(exN) ? new Prisma.Decimal(exN) : null,
              lineRevenue: totals.lineRevenue,
              lineCost: totals.lineCost,
              lineMargin: totals.lineMargin,
              perfumeSnapshot: newSnap,
            },
          });
        }
      }

      if (hasNewItems) {
        for (const n of body.newItems!) {
          const upN = parseMoneyField(n.unitPrice)!;
          const volIn =
            n.volumeMl === 30 || n.volumeMl === 50 || n.volumeMl === 100
              ? n.volumeMl
              : 100;
          const ucdN =
            n.unitCostDzd !== null && n.unitCostDzd !== undefined && n.unitCostDzd !== ""
              ? Number(n.unitCostDzd)
              : null;
          const exN =
            n.exchangeRate !== null && n.exchangeRate !== undefined && n.exchangeRate !== ""
              ? Number(n.exchangeRate)
              : null;
          const coN =
            ucdN !== null && exN !== null && Number.isFinite(ucdN) && Number.isFinite(exN) && exN > 0
              ? ucdN / exN
              : 0;

          const totals = computeLineTotals({
            quantity: n.quantity,
            unitPrice: upN,
            unitCost: coN,
          });

          const snap: Prisma.InputJsonValue = {
            name: n.snapshot.name,
            brandName: n.snapshot.brandName ?? null,
            image: n.snapshot.image ?? null,
            volumeMl: volIn,
          };

          await tx.saleItem.create({
            data: {
              saleId: id,
              perfumeId: n.perfumeId,
              quantity: n.quantity,
              volumeMl: volIn,
              unitPrice: totals.unitPrice,
              unitCost: totals.unitCost,
              unitCostDzd: ucdN !== null && Number.isFinite(ucdN) ? new Prisma.Decimal(ucdN) : null,
              exchangeRate: exN !== null && Number.isFinite(exN) ? new Prisma.Decimal(exN) : null,
              lineRevenue: totals.lineRevenue,
              lineCost: totals.lineCost,
              lineMargin: totals.lineMargin,
              perfumeSnapshot: snap,
            },
          });
        }
      }

      if (hasItems || hasNewItems || hasRemoveIds) {
        const allItems = await tx.saleItem.findMany({ where: { saleId: id } });
        const t = sumSaleTotals(
          allItems.map((i) => ({
            lineRevenue: i.lineRevenue,
            lineCost: i.lineCost,
            lineMargin: i.lineMargin,
          })),
        );
        const newTotal = Number(t.totalRevenue);
        const currentRem = Number(existing.remainingDue);
        const saleUpdate: Prisma.SaleUpdateInput = {
          totalRevenue: t.totalRevenue,
          totalCost: t.totalCost,
          totalMargin: t.totalMargin,
        };
        if (currentRem > newTotal) {
          saleUpdate.remainingDue = t.totalRevenue;
        }
        await tx.sale.update({ where: { id }, data: saleUpdate });
      }
      return id;
    });

    const refreshed = await getSaleById(updated);
    if (!refreshed) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    await writeAudit(ctx.sub, "sale.update", "Sale", id, {
      linesPatched: hasItems ? (body.items?.length ?? 0) : 0,
    });

    return NextResponse.json({ sale: refreshed });
  } catch (error) {
    console.error("[api/admin/sales/[id]][PATCH]", error);
    return jsonFromPrismaGestionError(error, "Impossible de mettre à jour la vente.");
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

    const existing = await prisma.sale.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        items: { select: { perfumeId: true, quantity: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    await prisma.sale.delete({ where: { id } });
    await reverseMovementsFor("Sale", id);
    await reverseMovementsFor(SALE_COST_REF, id);
    // Restitue le stock des lignes catalogue.
    for (const it of existing.items) {
      if (it.perfumeId !== null) {
        await prisma.perfume.update({
          where: { id: it.perfumeId },
          data: { stock: { increment: it.quantity } },
        });
      }
    }
    await writeAudit(ctx.sub, "sale.delete", "Sale", id, {
      orderId: existing.orderId,
    });
    revalidateTag(tagFor.treasury(), "default");
    revalidateTag(tagFor.perfumes(), "default");
    revalidateTag(tagFor.kpi(), "default");
    revalidateTag(tagFor.sales(), "default");
    revalidateTag(tagFor.batches(), "default");
    revalidateAdminCatalogue();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/sales/[id]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer la vente.");
  }
}
