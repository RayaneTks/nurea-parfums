import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import type { PocketKind, CashMovementKind } from "@prisma/client";

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
  return rows.map((r) => ({
    id: r.id,
    pocketId: r.pocketId,
    pocketName: r.pocket.name,
    amount: r.amount.toString(),
    kind: r.kind,
    label: r.label,
    refType: r.refType,
    refId: r.refId,
    occurredAt: r.occurredAt.toISOString(),
  }));
}
