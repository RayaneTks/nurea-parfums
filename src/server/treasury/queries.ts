import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import type { PocketKind, CashMovementKind } from "@prisma/client";
import { ORDER_COST_REF, SALE_COST_REF } from "@/server/orders/purchaseCost";

export type PocketWithBalance = {
  id: string;
  name: string;
  kind: PocketKind;
  isSystem: boolean;
  openingBalance: string;
  balance: string;
  sortOrder: number;
};

export type TreasurySummary = {
  total: string;
  /** Solde de la poche système « Non attribué » (à répartir si > 0). */
  unattributed: string;
  pockets: PocketWithBalance[];
};

export type MovementRow = {
  id: string;
  pocketId: string;
  pocketName: string;
  amount: string;
  kind: CashMovementKind;
  label: string | null;
  refType: string | null;
  refId: string | null;
  occurredAt: string;
  /** Libellé clair résolu (ex. « Vente · Fares »). */
  title: string;
  /** Lien vers l'origine (vente / commande / lot), null si interne. */
  href: string | null;
  /** Identifiant de regroupement (ex: « batch:<id> » pour grouper les dépenses d'un même lot). */
  groupKey: string | null;
  /** Libellé du groupe (ex. nom du lot). */
  groupLabel: string | null;
};

// Pas de cache : données financières à faible trafic qui doivent rester
// fraîches immédiatement après chaque mouvement (vente, dépense, transfert…).
export async function treasurySummary(): Promise<TreasurySummary> {
    const [pockets, sums] = await Promise.all([
      prisma.pocket.findMany({
        where: { archived: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          kind: true,
          isSystem: true,
          openingBalance: true,
          sortOrder: true,
        },
      }),
      prisma.cashMovement.groupBy({ by: ["pocketId"], _sum: { amount: true } }),
    ]);

    const sumMap = new Map<string, Decimal>(
      sums.map((s) => [s.pocketId, new Decimal((s._sum.amount ?? 0).toString())]),
    );

    let total = new Decimal(0);
    let unattributed = new Decimal(0);
    const rows: PocketWithBalance[] = pockets.map((p) => {
      const opening = new Decimal(p.openingBalance.toString());
      const balance = opening.plus(sumMap.get(p.id) ?? new Decimal(0));
      total = total.plus(balance);
      if (p.isSystem) unattributed = balance;
      return {
        id: p.id,
        name: p.name,
        kind: p.kind,
        isSystem: p.isSystem,
        openingBalance: opening.toFixed(2),
        balance: balance.toFixed(2),
        sortOrder: p.sortOrder,
      };
    });

    return {
      total: total.toFixed(2),
      unattributed: unattributed.toFixed(2),
      pockets: rows,
    };
}

/** Soldes des poches actives (sans le wrapper résumé). */
export async function listPockets(): Promise<PocketWithBalance[]> {
  return (await treasurySummary()).pockets;
}

export async function listMovements(params?: {
  pocketId?: string;
  limit?: number;
}): Promise<MovementRow[]> {
  const limit = Math.max(1, Math.min(params?.limit ?? 50, 200));
  const rows = await prisma.cashMovement.findMany({
    where: params?.pocketId ? { pocketId: params.pocketId } : undefined,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      pocketId: true,
      amount: true,
      kind: true,
      label: true,
      refType: true,
      refId: true,
      occurredAt: true,
      pocket: { select: { name: true } },
    },
  });
  // Résolution des origines en lots (titre clair + lien) — évite N+1.
  const saleIds = rows
    .filter((r) => (r.refType === "Sale" || r.refType === "SaleCost") && r.refId)
    .map((r) => r.refId!);
  const payIds = rows
    .filter((r) => r.refType === "PaymentTransaction" && r.refId)
    .map((r) => r.refId!);
  const expIds = rows.filter((r) => r.refType === "BatchExpense" && r.refId).map((r) => r.refId!);
  const orderIds = rows
    .filter((r) => r.refType === "OrderCost" && r.refId)
    .map((r) => r.refId!);

  const [sales, payments, expenses, orders] = await Promise.all([
    saleIds.length
      ? prisma.sale.findMany({
          where: { id: { in: saleIds } },
          select: { id: true, customerName: true, customer: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
    payIds.length
      ? prisma.paymentTransaction.findMany({
          where: { id: { in: payIds } },
          select: {
            id: true,
            type: true,
            orderId: true,
            order: {
              select: { customerName: true, customer: { select: { fullName: true } } },
            },
          },
        })
      : Promise.resolve([]),
    expIds.length
      ? prisma.batchExpense.findMany({
          where: { id: { in: expIds } },
          select: {
            id: true,
            label: true,
            batchId: true,
            batch: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    orderIds.length
      ? prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, customerName: true, customer: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
  ]);

  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const payMap = new Map(payments.map((p) => [p.id, p]));
  const expMap = new Map(expenses.map((e) => [e.id, e]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  function resolve(
    refType: string | null,
    refId: string | null,
    kind: CashMovementKind,
    fallback: string | null,
  ): { title: string; href: string | null; groupKey: string | null; groupLabel: string | null } {
    if (refType === "Sale" && refId) {
      const s = saleMap.get(refId);
      const who = s?.customer?.fullName ?? s?.customerName ?? "client";
      return {
        title: `Vente · ${who}`,
        href: `/admin/compta?sale=${refId}`,
        groupKey: null,
        groupLabel: null,
      };
    }
    if (refType === "PaymentTransaction" && refId) {
      const p = payMap.get(refId);
      const who = p?.order?.customer?.fullName ?? p?.order?.customerName ?? null;
      // Libellé dérivé du KIND du mouvement (toujours présent et cohérent avec le montant),
      // pas du type de paiement — qui peut être introuvable et retomberait à tort sur
      // « Remboursement ».
      const what =
        kind === "DEPOSIT_IN"
          ? "Acompte"
          : kind === "BALANCE_IN"
            ? "Solde"
            : kind === "REFUND_OUT"
              ? "Remboursement"
              : "Encaissement";
      return {
        title: who ? `${what} · ${who}` : what,
        href: p?.orderId ? `/admin/ordres/${p.orderId}` : null,
        groupKey: null,
        groupLabel: null,
      };
    }
    if (refType === "BatchExpense" && refId) {
      const e = expMap.get(refId);
      return {
        title: `Dépense · ${e?.label ?? "—"}`,
        href: e?.batchId ? `/admin/lots/${e.batchId}` : null,
        groupKey: e?.batchId ? `batch:${e.batchId}` : null,
        groupLabel: e?.batch?.name ?? null,
      };
    }
    if (refType === ORDER_COST_REF && refId) {
      const o = orderMap.get(refId);
      const who = o?.customer?.fullName ?? o?.customerName ?? null;
      return {
        title: who ? `Coût d'achat · ${who}` : "Coût d'achat",
        href: `/admin/ordres/${refId}`,
        groupKey: null,
        groupLabel: null,
      };
    }
    if (refType === SALE_COST_REF && refId) {
      const s = saleMap.get(refId);
      const who = s?.customer?.fullName ?? s?.customerName ?? null;
      return {
        title: who ? `Coût d'achat · ${who}` : "Coût d'achat",
        href: `/admin/compta?sale=${refId}`,
        groupKey: null,
        groupLabel: null,
      };
    }
    if (refType === "Batch" && refId) {
      // SUPPLIER_OUT lié à un Batch — groupe avec les dépenses du même lot.
      return {
        title: fallback || "Paiement fournisseur",
        href: `/admin/lots/${refId}`,
        groupKey: `batch:${refId}`,
        groupLabel: null,
      };
    }
    return { title: fallback || "Mouvement", href: null, groupKey: null, groupLabel: null };
  }

  return rows.map((r) => {
    const { title, href, groupKey, groupLabel } = resolve(r.refType, r.refId, r.kind, r.label);
    return {
      id: r.id,
      pocketId: r.pocketId,
      pocketName: r.pocket.name,
      amount: r.amount.toString(),
      kind: r.kind,
      label: r.label,
      refType: r.refType,
      refId: r.refId,
      occurredAt: r.occurredAt.toISOString(),
      title,
      href,
      groupKey,
      groupLabel,
    };
  });
}
