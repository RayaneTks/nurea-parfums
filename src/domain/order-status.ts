/**
 * Order status state machine.
 *
 * Philosophie : l'admin décide. Les statuts sont librement navigables — l'acompte
 * et le solde sont *indicatifs*, jamais bloquants. On garde uniquement 2 garde-fous
 * de cohérence dure :
 *   1. Une commande sans article ne peut pas être livrée.
 *   2. Une commande livrée déjà transformée en vente (`hasSale`) ne peut pas revenir
 *      en arrière sans supprimer d'abord la vente (sinon double comptage).
 *
 *   PENDING ⇄ READY ⇄ DELIVERED   (toutes directions libres)
 *      └──────── CANCELLED (via suppression) ────────┘
 *
 * Source of truth des paiements : PaymentTransaction. `Order.depositPaid` est un cache.
 */

export type OrderStatus = "PENDING" | "READY" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUSES = ["PENDING", "READY", "DELIVERED", "CANCELLED"] as const;

export type TransitionContext = {
  depositPaidTotal: number; // sum DEPOSIT - sum REFUND
  balancePaidTotal: number; // sum BALANCE
  orderTotal: number;
  hasSale: boolean;
  itemCount?: number;
};

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Statut librement modifiable entre PENDING / READY / DELIVERED.
 * Seuls 2 garde-fous de cohérence dure subsistent (voir en-tête).
 * L'annulation (CANCELLED) passe par la suppression, pas par ce contrôle.
 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx: TransitionContext,
): TransitionResult {
  if (from === to) return { ok: false, reason: "Statut identique." };

  if (to === "CANCELLED") {
    // L'annulation se fait via « Supprimer la commande », pas via le contrôle de statut.
    return from === "PENDING" || from === "READY"
      ? { ok: true }
      : { ok: false, reason: "Utilise « Supprimer la commande » pour annuler." };
  }

  if (from === "CANCELLED") {
    return { ok: false, reason: "Commande annulée — crées-en une nouvelle si besoin." };
  }

  // Garde-fou 1 : pas de livraison d'une commande vide.
  if (to === "DELIVERED" && (ctx.itemCount ?? 1) < 1) {
    return { ok: false, reason: "Ajoute au moins un article avant la livraison." };
  }

  // Garde-fou 2 : une commande devenue vente ne recule pas sans suppression de la vente.
  if (from === "DELIVERED" && ctx.hasSale) {
    return { ok: false, reason: "Supprime la vente associée d'abord." };
  }

  // Toutes les autres transitions PENDING/READY/DELIVERED sont autorisées.
  return { ok: true };
}

/**
 * Avancement de la livraison d'une commande, dérivé des quantités livrées par ligne.
 *
 * - `none`    : rien livré (toutes les lignes à 0).
 * - `partial` : au moins une ligne livrée mais pas tout.
 * - `full`    : chaque ligne entièrement livrée (deliveredQuantity >= quantity).
 *
 * Indépendant du `OrderStatus` (qui reste order-level) : une commande `READY`
 * peut être `partial` tant que tout n'est pas livré.
 */
export type Fulfillment = "none" | "partial" | "full";

type FulfillmentLine = { quantity: number; deliveredQuantity: number };

export function deriveFulfillment(items: readonly FulfillmentLine[]): Fulfillment {
  if (items.length === 0) return "none";
  let anyDelivered = false;
  let allDelivered = true;
  for (const it of items) {
    const delivered = Math.max(0, Math.min(it.deliveredQuantity, it.quantity));
    if (delivered > 0) anyDelivered = true;
    if (delivered < it.quantity) allDelivered = false;
  }
  if (allDelivered) return "full";
  return anyDelivered ? "partial" : "none";
}

/** Nombre de lignes pas encore entièrement livrées (pour « Reste à livrer : N article(s) »). */
export function remainingToDeliver(items: readonly FulfillmentLine[]): number {
  return items.reduce((acc, it) => {
    const delivered = Math.max(0, Math.min(it.deliveredQuantity, it.quantity));
    return acc + (delivered < it.quantity ? 1 : 0);
  }, 0);
}

export function statusLabel(s: OrderStatus): string {
  switch (s) {
    case "PENDING": return "En attente";
    case "READY": return "À traiter";
    case "DELIVERED": return "Livrée";
    case "CANCELLED": return "Annulée";
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
