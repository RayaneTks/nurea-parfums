import type { PrismaClient } from "@prisma/client";
import { OrderStatus } from "@prisma/client";

/** FUSEAU aligné Compta (France) : jour calendaire = jour métier. */
const TZ = "Europe/Paris";

function ymdInParis(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Le lendemain du jour de livraison (J+1) : la date courante est strictement après le jour de ref. */
export function isOnOrAfterDayAfterDelivery(ref: Date, now: Date): boolean {
  return ymdInParis(now) > ymdInParis(ref);
}

function refDayForPurge(
  deliveryAt: Date | null,
  saleSoldAt: Date | null | undefined,
): Date | null {
  if (deliveryAt) return deliveryAt;
  if (saleSoldAt) return saleSoldAt;
  return null;
}

/**
 * Après le jour de livraison (ou date de vente en compta si pas de date livr.) :
 * la commande disparaît de l’onglet commandes, la vente reste en compta (orderId → null).
 */
export async function purgeEphemeralOrders(db: PrismaClient): Promise<{
  deletedCancelled: number;
  deletedDelivered: number;
}> {
  const delCancelled = await db.order.deleteMany({ where: { status: OrderStatus.CANCELLED } });

  const delivered = await db.order.findMany({
    where: { status: OrderStatus.DELIVERED },
    select: { id: true, deliveryAt: true, sale: { select: { soldAt: true } } },
  });
  const now = new Date();
  const toDrop: string[] = [];
  for (const o of delivered) {
    const ref = refDayForPurge(o.deliveryAt, o.sale?.soldAt);
    if (ref && isOnOrAfterDayAfterDelivery(ref, now)) {
      toDrop.push(o.id);
    }
  }
  if (toDrop.length === 0) {
    return { deletedCancelled: delCancelled.count, deletedDelivered: 0 };
  }
  const r = await db.order.deleteMany({ where: { id: { in: toDrop } } });
  return { deletedCancelled: delCancelled.count, deletedDelivered: r.count };
}

/**
 * Cible une fiche : annulations effacées, ou livrée dont le jour J+1 est passé.
 * Retourne true si l’enregistrement a été supprimé (appelant = 404).
 */
export async function purgeOrderIfEphemeral(
  db: PrismaClient,
  id: string,
): Promise<boolean> {
  const o = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, deliveryAt: true, sale: { select: { soldAt: true } } },
  });
  if (!o) return false;
  if (o.status === OrderStatus.CANCELLED) {
    await db.order.delete({ where: { id: o.id } });
    return true;
  }
  if (o.status === OrderStatus.DELIVERED) {
    const ref = refDayForPurge(o.deliveryAt, o.sale?.soldAt);
    if (ref && isOnOrAfterDayAfterDelivery(ref, new Date())) {
      await db.order.delete({ where: { id: o.id } });
      return true;
    }
  }
  return false;
}
