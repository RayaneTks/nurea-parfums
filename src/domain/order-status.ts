/**
 * Statuts d'une commande, et ce qu'il faut savoir avant d'en changer.
 *
 *   En attente  ⇄  À traiter  ⇄  Livrée          (annulable depuis les trois)
 *
 * TOUTES les transitions entre ces trois statuts sont permises, dans les deux
 * sens. Ce module ne dit plus « non » : il dit « voilà ce que tu devrais savoir
 * avant de confirmer ».
 *
 * Pourquoi ce renversement. La machine exigeait un acompte pour passer en
 * « à traiter », et le solde entier pour passer en « livrée ». Ces règles
 * décrivent le cas courant, pas la réalité : une commande offerte vaut 0 €, un
 * client de confiance repart avec son flacon avant d'avoir payé, une erreur de
 * saisie se corrige à rebours. Dans tous ces cas l'écran refusait, sans recours,
 * et le patron de la boutique se retrouvait bloqué par son propre outil.
 *
 * La règle qui gouverne ce fichier : **on n'interdit que ce qui casserait les
 * données ; tout le reste se confirme.** Et il se trouve qu'ici rien ne casse
 * les données — changer un statut ne crée, ne modifie ni ne supprime aucune
 * vente ni aucun paiement (voir `app/api/admin/orders/[id]/route.ts`, qui
 * n'écrit que `data.status`). Ce qui restait interdit ne l'était donc que par
 * prudence, et la prudence se dit dans une boîte de dialogue, pas dans un mur.
 *
 * Reste un seul refus : changer un statut pour le même. Ce n'est pas une
 * interdiction, c'est un geste sans effet.
 *
 * Source de vérité des montants : PaymentTransaction. `Order.depositPaid` n'en
 * est qu'un cache dénormalisé.
 */

export type OrderStatus = "PENDING" | "READY" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUSES = ["PENDING", "READY", "DELIVERED", "CANCELLED"] as const;

export type TransitionContext = {
  depositPaidTotal: number; // somme DEPOSIT - somme REFUND
  balancePaidTotal: number; // somme BALANCE
  orderTotal: number;
  hasSale: boolean;
  itemCount?: number;
};

/**
 * Le verdict d'une transition.
 *
 * `confirm` porte ce que l'utilisateur doit lire AVANT de valider. Sa présence
 * n'empêche rien : elle demande un second geste. L'appelant qui l'ignore
 * applique la transition — c'est voulu pour les appels automatiques, mais
 * `paymentActions` montre le cas où il faut au contraire s'abstenir.
 */
export type TransitionResult =
  | { ok: true; confirm?: string }
  | { ok: false; reason: string };

/** Montant à la française — le domaine ne dépend d'aucun module d'affichage. */
function euros(montant: number): string {
  return `${montant.toFixed(2).replace(".", ",")} €`;
}

/** Ce qui reste à encaisser sur la commande. */
function resteDu(ctx: TransitionContext): number {
  return ctx.orderTotal - ctx.depositPaidTotal - ctx.balancePaidTotal;
}

/** Assemble les réserves en une seule phrase, ou rend `undefined` s'il n'y en a aucune. */
function confirmation(...reserves: (string | null)[]): { ok: true; confirm?: string } {
  const retenues = reserves.filter((r): r is string => r !== null);
  return retenues.length > 0 ? { ok: true, confirm: retenues.join(" ") } : { ok: true };
}

const SANS_ACOMPTE = "Aucun acompte n'a été encaissé.";
const SANS_ARTICLE = "Cette commande ne contient aucun article.";
const VENTE_LIEE =
  "Une vente est rattachée à cette commande : elle restera en comptabilité, le statut seul change.";

function reserveSolde(ctx: TransitionContext): string | null {
  const du = resteDu(ctx);
  return du > 0.005 ? `Il reste ${euros(du)} à encaisser.` : null;
}

function reserveAcomptes(ctx: TransitionContext): string | null {
  return ctx.depositPaidTotal > 0
    ? `${euros(ctx.depositPaidTotal)} d'acomptes restent enregistrés en comptabilité.`
    : null;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx: TransitionContext,
): TransitionResult {
  if (from === to) return { ok: false, reason: "Statut identique." };

  // Une commande annulée redevient modifiable — l'ancienne version en faisait un
  // cul-de-sac, ce qui obligeait à recréer la commande pour corriger un clic.
  if (from === "CANCELLED") {
    return {
      ok: true,
      confirm: "Cette commande était annulée : elle va réapparaître dans le suivi.",
    };
  }

  if (to === "CANCELLED") {
    return from === "DELIVERED"
      ? confirmation("Cette commande était livrée.", ctx.hasSale ? VENTE_LIEE : null)
      : { ok: true };
  }

  switch (from) {
    case "PENDING":
      if (to === "READY") {
        return confirmation(ctx.depositPaidTotal <= 0 ? SANS_ACOMPTE : null);
      }
      // Passage direct en livrée : l'écran propose les trois statuts côte à
      // côte, il serait absurde que la case du milieu soit obligatoire.
      return confirmation(
        "La commande passe directement de « en attente » à « livrée ».",
        (ctx.itemCount ?? 1) < 1 ? SANS_ARTICLE : null,
        reserveSolde(ctx),
      );

    case "READY":
      if (to === "DELIVERED") {
        return confirmation(
          (ctx.itemCount ?? 1) < 1 ? SANS_ARTICLE : null,
          reserveSolde(ctx),
        );
      }
      return confirmation(reserveAcomptes(ctx));

    case "DELIVERED":
      return confirmation(
        to === "PENDING" ? "La commande revient tout au début du suivi." : null,
        ctx.hasSale ? VENTE_LIEE : null,
      );

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
