/**
 * Statuts d'un document de vente, et ce qu'il faut savoir avant d'en changer (03 §2.3).
 *
 *   Commande (ORDER)        En attente ⇄ Confirmée ⇄ Livrée    (annulable depuis les trois)
 *   Vente directe           Livrée ⇄ Annulée
 *
 * Reprise de `order-status.ts` (READY devient CONFIRMED). La règle qui gouverne ce
 * fichier ne change pas : **on n'interdit que ce qui casserait les données ; tout le
 * reste se confirme.** La machine d'origine exigeait un acompte pour confirmer et le
 * solde pour livrer : une commande offerte vaut 0 €, un client de confiance repart
 * avant d'avoir payé, un clic se corrige à rebours. Ces cas bloquaient le gérant sans
 * recours ; ce sont désormais des réserves, dites dans une boîte de dialogue.
 *
 * Restent trois refus, chacun pour une raison de données :
 * - même statut : geste sans effet (le writer le traite en succès idempotent, 04 §3.6) ;
 * - vente directe hors de Livrée/Annulée : elle n'apparaît pas dans « Commandes » et n'a
 *   aucun contrôle de statut (06 S01) — en attente, elle sortirait de tous les chiffres
 *   et de tout écran capable de la faire avancer ;
 * - sortie d'Annulée ailleurs que par « Réactiver » : le seul accès (06 S01), dont la
 *   cible dépend de l'origine (commande → En attente, vente directe → Livrée).
 *
 * Changer de statut ne crée ni ne supprime aucun paiement : les montants restent dans
 * l'Encaissé quoi qu'il arrive au statut (« Soldé » n'est pas un statut, c'est dû = 0).
 */
import { NeedsConfirmation, DomainError } from "./errors";
import { eur, formatEur, type Eur } from "./money";
import { periodStart } from "./periods";

export type DocumentStatus = "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
export const DOCUMENT_STATUSES = ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"] as const;

export type DocumentOrigin = "ORDER" | "DIRECT_SALE";
export const DOCUMENT_ORIGINS = ["ORDER", "DIRECT_SALE"] as const;

export type TransitionContext = {
  origin: DocumentOrigin;
  /** Σ quantité × prix unitaire (jumeau : `documentBalance`). */
  total: Eur;
  /** Payé net : entrées moins remboursements. */
  paid: Eur;
  lineCount: number;
};

/**
 * Le verdict d'une transition. `reserves` porte ce que l'utilisateur doit lire AVANT de
 * valider ; non vide, il demande un second geste sans rien empêcher. Une transition
 * automatique (confirmation au premier acompte, 03 §2.3) ne s'applique que sur un
 * verdict dont `reserves` est vide.
 */
export type TransitionVerdict =
  | { ok: true; reserves: readonly string[] }
  | { ok: false; reason: string };

/** Engagé = sa dette compte dans À encaisser et son coût dans la Marge nette (03 §5.3, §5.4). */
export function isEngaged(status: DocumentStatus): boolean {
  return status === "CONFIRMED" || status === "DELIVERED";
}

/** Statut de naissance (T1) : une commande avec acompte naît confirmée, puisque confirmer ne porte alors aucune réserve. */
export function initialStatus(origin: DocumentOrigin, paid: Eur): DocumentStatus {
  if (origin === "DIRECT_SALE") return "DELIVERED";
  return eur.compare(paid, eur.zero) > 0 ? "CONFIRMED" : "PENDING";
}

/** Cible de « Réactiver » (06 S01, seul accès depuis Annulée). */
export function reactivationTarget(origin: DocumentOrigin): DocumentStatus {
  return origin === "DIRECT_SALE" ? "DELIVERED" : "PENDING";
}

const noun = (origin: DocumentOrigin) => (origin === "DIRECT_SALE" ? "vente" : "commande");

const SANS_ACOMPTE = "Aucun acompte n'a été encaissé.";
const POINTAGE_CONSERVE = "Les articles restent pointés comme livrés : le stock ne bouge pas.";

function reserveSolde(ctx: TransitionContext): string | null {
  const due = eur.sub(ctx.total, ctx.paid);
  return eur.compare(due, eur.zero) > 0 ? `Il reste ${formatEur(due)} à encaisser.` : null;
}

function reserveEncaisse(ctx: TransitionContext): string | null {
  return eur.compare(ctx.paid, eur.zero) > 0
    ? `Les ${formatEur(ctx.paid)} déjà encaissés restent comptés dans l'Encaissé.`
    : null;
}

function reserveArticles(ctx: TransitionContext): string | null {
  return ctx.lineCount < 1 ? `Cette ${noun(ctx.origin)} ne contient aucun article.` : null;
}

function allow(...reserves: (string | null)[]): TransitionVerdict {
  return { ok: true, reserves: reserves.filter((r): r is string => r !== null) };
}

export function canTransition(
  from: DocumentStatus,
  to: DocumentStatus,
  ctx: TransitionContext,
): TransitionVerdict {
  if (from === to) return { ok: false, reason: "Statut identique." };

  if (ctx.origin === "DIRECT_SALE" && (!isDirectSaleStatus(from) || !isDirectSaleStatus(to))) {
    return { ok: false, reason: "Une vente directe est livrée ou annulée : elle n'a pas d'autre statut." };
  }

  if (from === "CANCELLED") {
    if (to !== reactivationTarget(ctx.origin)) {
      return {
        ok: false,
        reason: "Réactive d'abord cette commande : elle revient « En attente ».",
      };
    }
    // L'ancienne version en faisait un cul-de-sac : corriger un clic obligeait à tout ressaisir.
    return ctx.origin === "DIRECT_SALE"
      ? allow(
          "Cette vente était annulée : elle redevient livrée et ses articles sont décomptés du stock.",
          reserveArticles(ctx),
          reserveSolde(ctx),
        )
      : allow("Cette commande était annulée : elle revient « En attente ».");
  }

  if (to === "CANCELLED") {
    return from === "DELIVERED"
      ? allow(`Cette ${noun(ctx.origin)} était livrée : le stock est restitué.`)
      : allow();
  }

  switch (from) {
    case "PENDING":
      if (to === "CONFIRMED") {
        return allow(eur.compare(ctx.paid, eur.zero) > 0 ? null : SANS_ACOMPTE);
      }
      // Passage direct en livrée : l'écran propose les trois statuts côte à côte,
      // la case du milieu ne peut pas être un péage.
      return allow(
        "La commande passe directement de « En attente » à « Livrée ».",
        reserveArticles(ctx),
        reserveSolde(ctx),
      );

    case "CONFIRMED":
      if (to === "DELIVERED") return allow(reserveArticles(ctx), reserveSolde(ctx));
      return allow(reserveEncaisse(ctx));

    case "DELIVERED":
      // Sortir de Livrée ne touche pas aux quantités livrées (03 §2.3) : le dire, sinon
      // le gérant croit le stock restitué.
      return to === "CONFIRMED"
        ? allow(POINTAGE_CONSERVE)
        : allow("La commande revient tout au début du suivi.", POINTAGE_CONSERVE, reserveEncaisse(ctx));

    default: {
      const _exhaustive: never = from;
      return { ok: false, reason: `Statut inconnu : ${_exhaustive as string}` };
    }
  }
}

/** Les deux seuls statuts d'une vente directe. */
function isDirectSaleStatus(status: DocumentStatus): boolean {
  return status === "DELIVERED" || status === "CANCELLED";
}

/** Titre du `ConfirmDialog` d'une transition (06 S18). */
export function transitionTitle(from: DocumentStatus, to: DocumentStatus, origin: DocumentOrigin): string {
  const n = noun(origin);
  if (from === "CANCELLED") return `Réactiver cette ${n} ?`;
  switch (to) {
    case "CANCELLED":
      return `Annuler cette ${n} ?`;
    case "DELIVERED":
      return `Livrer cette ${n} ?`;
    case "CONFIRMED":
      return from === "PENDING" ? `Confirmer cette ${n} ?` : "Revenir à « Confirmée » ?";
    case "PENDING":
      return `Remettre cette ${n} en attente ?`;
    default: {
      const _exhaustive: never = to;
      return _exhaustive;
    }
  }
}

/**
 * Garde du writer (T4). Rend `false` pour un statut identique (rien à écrire, succès
 * idempotent), `true` si la transition s'applique ; lève `DomainError("CONFLICT")` sur un
 * refus et `NeedsConfirmation` sur une réserve non confirmée. Les réserves de stock
 * (`applyDeliveredDelta`) s'ajoutent à `extraReserves` pour tenir dans UN dialogue.
 */
export function assertTransition(
  from: DocumentStatus,
  to: DocumentStatus,
  ctx: TransitionContext,
  options: { confirmed: boolean; extraReserves?: readonly string[] },
): boolean {
  if (from === to) return false;
  const verdict = canTransition(from, to, ctx);
  if (!verdict.ok) throw new DomainError("CONFLICT", verdict.reason);
  const reserves = [...verdict.reserves, ...(options.extraReserves ?? [])];
  if (reserves.length > 0 && !options.confirmed) {
    throw new NeedsConfirmation(transitionTitle(from, to, ctx.origin), reserves, "Confirmer");
  }
  return true;
}

export type EventTimestamps = {
  confirmedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
};

/**
 * Horodatages d'événement après une transition, cohérents avec les CHECK
 * `doc_confirmed_at_ck`, `doc_delivered_at_ck`, `doc_cancelled_at_ck` (03 §4.9).
 * `confirmedAt` rattache le coût à une période (03 §5.4) : il est conservé tant que le
 * document reste engagé (Livrée → Confirmée ne le déplace pas), posé à l'engagement,
 * effacé au retour en attente et à l'annulation — d'où une vente directe réactivée
 * datée de l'instant de la réactivation.
 */
export function timestampsAfter(
  from: DocumentStatus,
  to: DocumentStatus,
  current: EventTimestamps,
  now: Date,
): EventTimestamps {
  return {
    confirmedAt: isEngaged(to) ? (isEngaged(from) ? current.confirmedAt ?? now : now) : null,
    deliveredAt: to === "DELIVERED" ? (from === "DELIVERED" ? current.deliveredAt ?? now : now) : null,
    cancelledAt: to === "CANCELLED" ? (from === "CANCELLED" ? current.cancelledAt ?? now : now) : null,
  };
}

/**
 * « En retard » (03 §5.6) : livraison prévue avant 00:00 Europe/Paris aujourd'hui, ni livré
 * ni annulé. Jumeau de la requête `enRetard` pour un document déjà chargé.
 */
export function isOverdue(
  doc: { status: DocumentStatus; expectedDeliveryAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (doc.status !== "PENDING" && doc.status !== "CONFIRMED") return false;
  return doc.expectedDeliveryAt !== null && doc.expectedDeliveryAt < periodStart("day", now);
}

/** Libellés d'écran (06 §1.7). Jamais « À traiter ». */
export function statusLabel(s: DocumentStatus): string {
  switch (s) {
    case "PENDING":
      return "En attente";
    case "CONFIRMED":
      return "Confirmée";
    case "DELIVERED":
      return "Livrée";
    case "CANCELLED":
      return "Annulée";
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
