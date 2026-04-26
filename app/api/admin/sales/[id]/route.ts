import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { computeLineTotals, sumSaleTotals } from "@/lib/gestion/calculations";
import { isValidVolumeMl, parseMoneyField } from "@/lib/gestion/orderLineValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const saleInclude = {
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
  order: { select: { id: true, customerName: true, orderedAt: true } },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: saleInclude,
    });

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
  quantity?: number;
  volumeMl?: number;
};

type PatchSaleBody = {
  notes?: string | null;
  items?: PatchSaleItemBody[];
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
    const hasNotes = "notes" in body;
    if (!hasItems && !hasNotes) {
      return NextResponse.json(
        { error: "Rien à mettre à jour (notes ou lignes requis)." },
        { status: 400 },
      );
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
        const coRaw = p.unitCost === undefined ? item.unitCost.toString() : p.unitCost;
        const upN = parseMoneyField(upRaw);
        const coN = parseMoneyField(coRaw);
        if (upN === null || coN === null) {
          return NextResponse.json(
            { error: "Prix ou coût invalide sur une ligne." },
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

    const updated = await prisma.$transaction(async (tx) => {
      if ("notes" in body) {
        await tx.sale.update({
          where: { id },
          data: { notes: body.notes?.trim() || null },
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
          const coRaw = p.unitCost === undefined ? item.unitCost.toString() : p.unitCost;
          const upN = parseMoneyField(upRaw)!;
          const coN = parseMoneyField(coRaw)!;

          const volRaw =
            p.volumeMl === undefined
              ? item.volumeMl
              : Number(p.volumeMl);
          const volIn =
            volRaw === null || volRaw === undefined
              ? 100
              : volRaw;

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
              lineRevenue: totals.lineRevenue,
              lineCost: totals.lineCost,
              lineMargin: totals.lineMargin,
              perfumeSnapshot: newSnap,
            },
          });
        }

        const allItems = await tx.saleItem.findMany({ where: { saleId: id } });
        const t = sumSaleTotals(
          allItems.map((i) => ({
            lineRevenue: i.lineRevenue,
            lineCost: i.lineCost,
            lineMargin: i.lineMargin,
          })),
        );
        await tx.sale.update({
          where: { id },
          data: {
            totalRevenue: t.totalRevenue,
            totalCost: t.totalCost,
            totalMargin: t.totalMargin,
          },
        });
      }
      return tx.sale.findUniqueOrThrow({ where: { id }, include: saleInclude });
    });

    await writeAudit(ctx.sub, "sale.update", "Sale", id, {
      linesPatched: hasItems ? (body.items?.length ?? 0) : 0,
    });

    return NextResponse.json({ sale: updated });
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
      select: { id: true, orderId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    await prisma.sale.delete({ where: { id } });
    await writeAudit(ctx.sub, "sale.delete", "Sale", id, {
      orderId: existing.orderId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/sales/[id]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer la vente.");
  }
}
