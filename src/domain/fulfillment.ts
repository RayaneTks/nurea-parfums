/**
 * Avancement de la livraison d'un document, dérivé des quantités livrées par ligne
 * (reprise de `order-status.ts`).
 *
 * - `none`    : rien livré (toutes les lignes à 0, ou aucune ligne).
 * - `partial` : au moins une unité livrée, mais pas tout.
 * - `full`    : chaque ligne entièrement livrée.
 *
 * Indépendant du statut : une commande « Confirmée » peut être `partial` tant que tout
 * n'est pas livré. Le stock suivi bouge du DELTA de `deliveredQuantity` (03 §4.7), jamais
 * du statut lui-même.
 */
export type Fulfillment = "none" | "partial" | "full";

export type FulfillmentLine = { quantity: number; deliveredQuantity: number };

/**
 * Borne 0..quantité (CHECK `line_delivered_ck`). Le pointage envoie une valeur absolue
 * (04 §3.6) : un envoi rejoué ou excessif se borne au lieu d'échouer.
 */
export function clampDelivered(deliveredQuantity: number, quantity: number): number {
  return Math.max(0, Math.min(deliveredQuantity, quantity));
}

export function deriveFulfillment(items: readonly FulfillmentLine[]): Fulfillment {
  if (items.length === 0) return "none";
  let anyDelivered = false;
  let allDelivered = true;
  for (const it of items) {
    const delivered = clampDelivered(it.deliveredQuantity, it.quantity);
    if (delivered > 0) anyDelivered = true;
    if (delivered < it.quantity) allDelivered = false;
  }
  if (allDelivered) return "full";
  return anyDelivered ? "partial" : "none";
}

/** Nombre de lignes pas encore entièrement livrées (« Reste à livrer : N article(s) »). */
export function remainingToDeliver(items: readonly FulfillmentLine[]): number {
  return items.reduce(
    (acc, it) => acc + (clampDelivered(it.deliveredQuantity, it.quantity) < it.quantity ? 1 : 0),
    0,
  );
}
