/**
 * Order status state machine.
 *
 * PENDING  ─(deposit recorded)─→ READY
 *    │                              │
 *    └────────(cancel)─→ CANCELLED ←┘
 *                                   │
 *                              (deliver)
 *                                   ↓
 *                              DELIVERED
 *
 * Source of truth: PaymentTransaction (P6). `Order.depositPaid` is a denormalized cache.
 */

export type OrderStatus = "PENDING" | "READY" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUSES = ["PENDING", "READY", "DELIVERED", "CANCELLED"] as const;

export type OrderTransition =
  | { from: "PENDING"; to: "READY"; requires: "deposit-positive" }
  | { from: "PENDING"; to: "CANCELLED"; requires: "none" }
  | { from: "READY"; to: "DELIVERED"; requires: "balance-paid" }
  | { from: "READY"; to: "PENDING"; requires: "deposit-voided" }
  | { from: "READY"; to: "CANCELLED"; requires: "none" }
  | { from: "DELIVERED"; to: "READY"; requires: "sale-deleted" }; // admin correction path

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

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx: TransitionContext,
): TransitionResult {
  if (from === to) return { ok: false, reason: "Statut identique." };

  switch (from) {
    case "PENDING":
      if (to === "READY") {
        if (ctx.depositPaidTotal <= 0) {
          return { ok: false, reason: "Acompte requis pour passer en « à traiter »." };
        }
        return { ok: true };
      }
      if (to === "CANCELLED") return { ok: true };
      return { ok: false, reason: `Transition ${from} → ${to} interdite.` };

    case "READY":
      if (to === "DELIVERED") {
        if ((ctx.itemCount ?? 1) < 1) {
          return { ok: false, reason: "Ajoute au moins un article avant la livraison." };
        }
        const due = ctx.orderTotal - ctx.depositPaidTotal - ctx.balancePaidTotal;
        if (due > 0.005) {
          return { ok: false, reason: `Solde dû ${due.toFixed(2)} € — encaisse avant livraison.` };
        }
        return { ok: true };
      }
      if (to === "PENDING") {
        if (ctx.depositPaidTotal > 0) {
          return { ok: false, reason: "Annule les acomptes d'abord." };
        }
        return { ok: true };
      }
      if (to === "CANCELLED") return { ok: true };
      return { ok: false, reason: `Transition ${from} → ${to} interdite.` };

    case "DELIVERED":
      if (to === "READY") {
        if (ctx.hasSale) {
          return { ok: false, reason: "Supprime la vente associée d'abord." };
        }
        return { ok: true };
      }
      return { ok: false, reason: "Commande livrée — utilise une correction manuelle." };

    case "CANCELLED":
      return { ok: false, reason: "Commande annulée — création d'une nouvelle si besoin." };

    default: {
      const _exhaustive: never = from;
      return { ok: false, reason: `Statut inconnu: ${_exhaustive as string}` };
    }
  }
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
