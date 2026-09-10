"use client";

import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { canTransition, statusLabel } from "@/domain/order-status";
import type { OrderDetailRow } from "@/server/orders/queries";

/**
 * Le changement de statut d'une commande, en un seul exemplaire.
 *
 * La fiche commande offrait DEUX chemins vers « livrée » : le sélecteur de
 * statut, qui consultait le domaine et faisait valider les réserves, et un
 * bouton « Tout est livré — marquer livrée » qui envoyait le PATCH directement.
 * Le second passait donc outre l'avertissement du premier : une commande de
 * 200 € dont 50 € seulement avaient été encaissés basculait en livrée d'un
 * tap, sans que « Il reste 150,00 € à encaisser » soit jamais montré.
 *
 * Deux boutons pour une même transition doivent partager la même règle, sinon
 * la règle n'existe que sur le bouton que l'utilisateur n'a pas pris.
 */

export type StatusConfirm = { next: OrderStatus; reserve: string };

type OrderForTransition = Pick<
  OrderDetailRow,
  "id" | "status" | "total" | "due" | "depositPaid" | "hasSale" | "items"
>;

/** Contexte de décision, dérivé des montants réels de la commande. */
export function toTransitionContext(order: OrderForTransition) {
  const orderTotal = Number(order.total);
  const depositPaidTotal = Number(order.depositPaid);
  const paidTotal = orderTotal - Number(order.due);
  return {
    depositPaidTotal,
    balancePaidTotal: Math.max(0, paidTotal - depositPaidTotal),
    orderTotal,
    hasSale: order.hasSale,
    itemCount: order.items.length,
  };
}

/**
 * Envoie le statut et **rend une promesse qui rejette** en cas d'échec.
 *
 * Le rejet n'est pas une négligence : c'est le canal par lequel
 * `ConfirmDialog` apprend que l'action a échoué et affiche le message dans la
 * boîte, là où le regard est déjà. Un handler qui avale son erreur laisse
 * l'utilisateur devant une boîte qui ne réagit pas.
 */
export async function patchOrderStatus(
  orderId: string,
  next: OrderStatus,
): Promise<OrderStatus> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  } catch {
    throw new Error("Réseau indisponible. Réessaie.");
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Impossible de changer le statut.");
  }

  const json = (await res.json()) as { order: { status: OrderStatus } };
  return json.order.status;
}

type UseOrderStatusChangeOptions = {
  order: OrderForTransition;
  onApplied: (next: OrderStatus) => void;
  onError: (message: string) => void;
};

/**
 * Orchestre : consulter le domaine, demander confirmation s'il y a une réserve,
 * appliquer sinon.
 */
export function useOrderStatusChange({
  order,
  onApplied,
  onError,
}: UseOrderStatusChangeOptions) {
  const [confirmTarget, setConfirmTarget] = useState<StatusConfirm | null>(null);

  const apply = async (next: OrderStatus): Promise<void> => {
    const applied = await patchOrderStatus(order.id, next);
    setConfirmTarget(null);
    onApplied(applied);
  };

  /**
   * Point d'entrée des deux boutons. Une réserve suspend le geste le temps
   * d'une validation ; sans réserve on applique directement — un changement
   * anodin ne mérite pas une boîte de dialogue à chaque fois.
   */
  const request = (next: OrderStatus) => {
    if (next === order.status) return;

    const guard = canTransition(order.status, next, toTransitionContext(order));
    if (!guard.ok) {
      onError(guard.reason);
      return;
    }
    if (guard.confirm) {
      setConfirmTarget({ next, reserve: guard.confirm });
      return;
    }
    void apply(next).catch((e: unknown) => {
      onError(e instanceof Error ? e.message : "Impossible de changer le statut.");
    });
  };

  return {
    confirmTarget,
    dismissConfirm: () => setConfirmTarget(null),
    confirmTitle: confirmTarget
      ? `Passer en « ${statusLabel(confirmTarget.next).toLowerCase()} » ?`
      : "",
    /** À brancher sur `onConfirm` de la ConfirmDialog : la promesse est attendue. */
    confirmAction: () => (confirmTarget ? apply(confirmTarget.next) : Promise.resolve()),
    request,
  };
}
