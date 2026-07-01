import { NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import {
  computeLineTotals,
  parsePeriod,
  periodStartDate,
  sumSaleTotals,
} from "@/lib/gestion/calculations";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { isValidVolumeMl, resolveUnitCostEur } from "@/lib/gestion/orderLineValidation";
import { recordMovement } from "@/server/treasury/movements";
import { revalidateTag } from "next/cache";
import { tagFor } from "@/lib/admin/cache-tags";
import { revalidateAdminCatalogue } from "@/lib/admin/revalidateAdminCatalogue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SaleLineInputBody = {
  perfumeId?: number | null;
  /** Snapshot manuel envoyé par le client pour les lignes "saisie libre" (perfumeId === null). */
  perfumeSnapshot?: {
    name?: string;
    brandName?: string;
    image?: string | null;
  } | null;
  quantity?: number;
  unitPrice?: number | string;
  unitCost?: number | string;
  unitCostDzd?: number | string | null;
  exchangeRate?: number | string | null;
  volumeMl?: number;
  isGift?: boolean;
};

type CreateSaleBody = {
  orderId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerContact?: string | null;
  soldAt?: string | null;
  notes?: string | null;
  remainingDue?: number | string | null;
  items?: SaleLineInputBody[];
  /** Répartition de l'encaissé par poche (ex. 20€ espèces + 30€ Revolut). */
  payments?: { pocketId?: string | null; amount?: number | string }[];
};

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

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const from = periodStartDate(period);

    const sales = await prisma.sale.findMany({
      where: from ? { soldAt: { gte: from } } : undefined,
      orderBy: { soldAt: "desc" },
      include: saleInclude,
    });

    return NextResponse.json({ sales, period });
  } catch (error) {
    console.error("[api/admin/sales][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger les ventes.");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    let body: CreateSaleBody;
    try {
      body = (await request.json()) as CreateSaleBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Ajoute au moins une ligne à la vente." },
        { status: 400 },
      );
    }

    const normalizedLines: {
      perfumeId: number | null;
      manualName: string | null;
      manualBrand: string | null;
      volumeMl: number;
      isGift: boolean;
      quantity: number;
      unitPrice: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      unitCostDzd: Prisma.Decimal | null;
      exchangeRate: Prisma.Decimal | null;
      lineRevenue: Prisma.Decimal;
      lineCost: Prisma.Decimal;
      lineMargin: Prisma.Decimal;
    }[] = [];

    for (const raw of rawItems) {
      const perfumeIdRaw = raw.perfumeId;
      const perfumeId =
        perfumeIdRaw === null || perfumeIdRaw === undefined
          ? null
          : typeof perfumeIdRaw === "number"
            ? perfumeIdRaw
            : Number(perfumeIdRaw);
      if (perfumeId !== null && (!Number.isFinite(perfumeId) || perfumeId <= 0)) {
        return NextResponse.json(
          { error: "Parfum invalide dans une des lignes." },
          { status: 400 },
        );
      }

      const quantity =
        typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: "Quantité invalide (minimum 1)." },
          { status: 400 },
        );
      }

      const vol =
        raw.volumeMl === undefined || raw.volumeMl === null
          ? 100
          : Number(raw.volumeMl);
      if (!isValidVolumeMl(vol)) {
        return NextResponse.json(
          { error: "Volume invalide (30, 50 ou 100 ml par ligne)." },
          { status: 400 },
        );
      }

      const unitPriceN = Number(raw.unitPrice);
      if (!Number.isFinite(unitPriceN) || unitPriceN < 0) {
        return NextResponse.json(
          { error: "Prix client invalide (doit être ≥ 0)." },
          { status: 400 },
        );
      }
      // Coût dérivé du DZD/taux (le formulaire n'envoie pas d'euro direct).
      const unitCostN = resolveUnitCostEur({
        unitCost: raw.unitCost,
        unitCostDzd: raw.unitCostDzd,
        exchangeRate: raw.exchangeRate,
      });
      if (unitCostN === null) {
        return NextResponse.json(
          { error: "Prix d'achat (ton coût) invalide (doit être ≥ 0)." },
          { status: 400 },
        );
      }

      const totals = computeLineTotals({
        quantity,
        unitPrice: unitPriceN,
        unitCost: unitCostN,
      });
      const ucdRaw = raw.unitCostDzd;
      const exRaw = raw.exchangeRate;
      const ucdN = ucdRaw ? Number(ucdRaw) : null;
      const exN = exRaw ? Number(exRaw) : null;

      let manualName: string | null = null;
      let manualBrand: string | null = null;
      if (perfumeId === null) {
        const snap = raw.perfumeSnapshot;
        const name = snap?.name?.trim();
        if (!name || name.length < 2) {
          return NextResponse.json(
            { error: "Nom du parfum requis (≥ 2 caractères) pour une saisie libre." },
            { status: 400 },
          );
        }
        manualName = name;
        manualBrand = snap?.brandName?.trim() || "Hors catalogue";
      }

      normalizedLines.push({
        perfumeId: perfumeId ?? null,
        manualName,
        manualBrand,
        volumeMl: vol,
        isGift: Boolean(raw.isGift),
        unitCostDzd: ucdN !== null && Number.isFinite(ucdN) ? new Prisma.Decimal(ucdN) : null,
        exchangeRate: exN !== null && Number.isFinite(exN) ? new Prisma.Decimal(exN) : null,
        ...totals,
      });
    }

    const perfumeIds = normalizedLines
      .map((l) => l.perfumeId)
      .filter((id): id is number => id !== null);
    const perfumes = perfumeIds.length
      ? await prisma.perfume.findMany({
          where: { id: { in: [...new Set(perfumeIds)] } },
          include: { brand: { select: { id: true, name: true } } },
        })
      : [];
    const perfumeById = new Map(perfumes.map((p) => [p.id, p]));

    for (const line of normalizedLines) {
      if (line.perfumeId !== null && !perfumeById.has(line.perfumeId)) {
        return NextResponse.json(
          { error: "Un des parfums référencés n'existe pas." },
          { status: 404 },
        );
      }
    }

    let linkedOrderId: string | null = null;
    let orderCustomerName: string | null = null;
    let orderBatchId: string | null = null;
    if (body.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: body.orderId },
        include: { sale: { select: { id: true } } },
      });
      if (!order) {
        return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
      }
      if (order.sale) {
        return NextResponse.json(
          { error: "Cette commande a déjà une vente associée." },
          { status: 409 },
        );
      }
      linkedOrderId = order.id;
      orderCustomerName = order.customerName;
      // La vente hérite du lot de la commande : sinon la transaction disparaîtrait du lot
      // (la commande est exclue car elle a une vente, et la vente ne serait pas rattachée).
      orderBatchId = order.batchId;
    }

    const totals = sumSaleTotals(normalizedLines);

    const soldAt =
      body.soldAt && body.soldAt.trim().length > 0 ? new Date(body.soldAt) : new Date();
    if (Number.isNaN(soldAt.getTime())) {
      return NextResponse.json({ error: "Date de vente invalide." }, { status: 400 });
    }

    const customerName =
      body.customerName?.trim() || orderCustomerName || null;
    const customerContact = body.customerContact?.trim() || null;

    let linkedCustomerId: string | null = null;
    if (body.customerId) {
      const found = await prisma.customer.findUnique({
        where: { id: body.customerId },
        select: { id: true },
      });
      if (!found) {
        return NextResponse.json({ error: "Client introuvable." }, { status: 400 });
      }
      linkedCustomerId = found.id;
    }

    const remainingDueRaw = body.remainingDue;
    const remainingDueN =
      remainingDueRaw === null || remainingDueRaw === undefined || remainingDueRaw === ""
        ? 0
        : Number(String(remainingDueRaw).replace(",", "."));
    if (!Number.isFinite(remainingDueN) || remainingDueN < 0) {
      return NextResponse.json(
        { error: "Reste à payer invalide (doit être ≥ 0)." },
        { status: 400 },
      );
    }
    if (remainingDueN > Number(totals.totalRevenue)) {
      return NextResponse.json(
        { error: "Reste à payer ne peut pas dépasser le total de la vente." },
        { status: 400 },
      );
    }

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          orderId: linkedOrderId,
          batchId: orderBatchId,
          customerId: linkedCustomerId,
          customerName,
          customerContact,
          soldAt,
          notes: body.notes?.trim() || null,
          totalRevenue: totals.totalRevenue,
          totalCost: totals.totalCost,
          totalMargin: totals.totalMargin,
          remainingDue: new Prisma.Decimal(remainingDueN),
          items: {
            create: normalizedLines.map((line) => {
              const perfume = line.perfumeId !== null ? perfumeById.get(line.perfumeId) : null;
              const snapshot = perfume
                ? {
                    perfumeId: perfume.id,
                    name: perfume.name,
                    brandName: perfume.brand?.name ?? null,
                    image: perfume.image,
                    volumeMl: line.volumeMl,
                  }
                : {
                    perfumeId: null,
                    name: line.manualName ?? "Sans nom",
                    brandName: line.manualBrand ?? "Hors catalogue",
                    image: null,
                    volumeMl: line.volumeMl,
                  };
              return {
                perfumeId: line.perfumeId,
                perfumeSnapshot: snapshot,
                quantity: line.quantity,
                volumeMl: line.volumeMl,
                isGift: line.isGift,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost,
                unitCostDzd: line.unitCostDzd,
                exchangeRate: line.exchangeRate,
                lineRevenue: line.lineRevenue,
                lineCost: line.lineCost,
                lineMargin: line.lineMargin,
              };
            }),
          },
        },
        include: saleInclude,
      });

      if (linkedOrderId) {
        await tx.order.update({
          where: { id: linkedOrderId },
          data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
        });
      }

      // Décrément du stock pour les lignes catalogue.
      for (const line of normalizedLines) {
        if (line.perfumeId !== null) {
          await tx.perfume.update({
            where: { id: line.perfumeId },
            data: { stock: { decrement: line.quantity } },
          });
        }
      }

      return created;
    });

    // Trésorerie : l'encaissé (totalRevenue − remainingDue) entre dans une/des poche(s).
    //
    // IMPORTANT — pas de double comptage : une vente issue d'une commande (`linkedOrderId`)
    // n'a d'accès à « Finaliser » que lorsque la commande est déjà soldée (due ≤ 0). Son
    // argent est donc DÉJÀ en trésorerie via les paiements de la commande (DEPOSIT_IN /
    // BALANCE_IN). On ne ré-enregistre rien ici. La trésorerie ne compte l'argent d'une
    // commande qu'une seule fois, via ses paiements.
    const cashed = Number(totals.totalRevenue) - remainingDueN;
    if (!linkedOrderId && cashed > 0.005) {
      const splits = Array.isArray(body.payments) ? body.payments : [];
      let attributed = 0;
      for (const p of splits) {
        const amt = Number(String(p.amount ?? "").replace(",", "."));
        if (!Number.isFinite(amt) || amt <= 0) continue;
        // Plafonne l'attribution au montant de la vente : si le client a donné plus
        // (rendu de monnaie), on n'enregistre en trésorerie que la part de la vente,
        // jamais l'excédent rendu.
        const room = cashed - attributed;
        if (room <= 0.005) break;
        const rec = Math.min(amt, room);
        attributed += rec;
        await recordMovement({
          pocketId: p.pocketId ?? null,
          amount: rec,
          kind: "SALE_IN",
          label: "Vente",
          refType: "Sale",
          refId: sale.id,
          occurredAt: soldAt,
          createdById: ctx.sub,
        });
      }
      // Reste non réparti → « Non attribué » (conservation : tout l'encaissé est tracé).
      const remainder = cashed - attributed;
      if (remainder > 0.005) {
        await recordMovement({
          pocketId: null,
          amount: remainder,
          kind: "SALE_IN",
          label: "Vente (non attribué)",
          refType: "Sale",
          refId: sale.id,
          occurredAt: soldAt,
          createdById: ctx.sub,
        });
      }
    }

    await writeAudit(ctx.sub, "sale.create", "Sale", sale.id, {
      itemCount: normalizedLines.length,
      orderId: linkedOrderId,
      totalRevenue: totals.totalRevenue.toString(),
      totalMargin: totals.totalMargin.toString(),
    });

    revalidateTag(tagFor.treasury(), "default");
    revalidateTag(tagFor.perfumes(), "default");
    revalidateAdminCatalogue();

    return NextResponse.json({ sale });
  } catch (error) {
    console.error("[api/admin/sales][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible d'enregistrer la vente.");
  }
}
