import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordMovement, reverseMovementsFor } from "@/server/treasury/movements";

type Db = PrismaClient | Prisma.TransactionClient;

/** refType du mouvement de trésorerie représentant l'achat du stock d'une commande. */
export const ORDER_COST_REF = "OrderCost";
/** refType du mouvement de trésorerie représentant l'achat du stock d'une vente directe. */
export const SALE_COST_REF = "SaleCost";

/**
 * Synchronise la SORTIE de trésorerie représentant l'achat du stock d'une commande.
 *
 * Sans système de stock, chaque commande = un achat réel : le coût de revient
 * (Σ unitCost × quantité) est de l'argent qui SORT quand la commande devient réelle
 * (statut « À traiter » ou « Livrée »), et qui REVIENT si elle repasse « En attente ».
 *
 * Idempotent : on contre-passe l'ancien mouvement puis on ré-enregistre selon l'état
 * courant (gère les changements de coût après édition d'articles). La poche est conservée
 * d'un re-sync à l'autre sauf si une nouvelle est fournie explicitement.
 */
export async function syncOrderPurchaseCost(
  orderId: string,
  opts: { pocketId?: string | null } = {},
  db: Db = prisma,
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      customerName: true,
      items: { select: { unitCost: true, quantity: true } },
    },
  });
  if (!order) return;

  const cost = order.items.reduce(
    (acc, it) => acc + Number(it.unitCost) * it.quantity,
    0,
  );
  const shouldExist =
    (order.status === "READY" || order.status === "DELIVERED") && cost > 0.005;

  // Poche déjà utilisée (pour conserver l'attribution lors d'un re-sync sur édition).
  const existing = await db.cashMovement.findFirst({
    where: { refType: ORDER_COST_REF, refId: orderId },
    select: { pocketId: true },
  });
  const pocketId =
    opts.pocketId !== undefined ? opts.pocketId : existing?.pocketId ?? null;

  await reverseMovementsFor(ORDER_COST_REF, orderId, db);

  if (shouldExist) {
    await recordMovement(
      {
        pocketId,
        amount: cost,
        kind: "SUPPLIER_OUT",
        label: "Coût d'achat",
        refType: ORDER_COST_REF,
        refId: orderId,
      },
      db,
    );
  }
}
