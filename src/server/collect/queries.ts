import Decimal from "decimal.js-light";
import { prisma } from "@/lib/db/prisma";
import { cache } from "react";

/**
 * Tout ce qui reste dû, ventes ET commandes confondues.
 *
 * L'app portait deux modèles de dette qui ne se parlaient pas : les commandes
 * via `PaymentTransaction`, les ventes via le champ hérité `Sale.remainingDue`.
 * Résultat, encaisser un vieux ticket voulait dire ouvrir la fiche, corriger un
 * nombre à la main, et l'argent n'entrait jamais en trésorerie.
 *
 * Cette requête réunit les deux sources sous une forme unique, pour que
 * l'encaissement soit UNE action, quelle que soit l'origine de la créance.
 */

export type OutstandingKind = "sale" | "order";

export type OutstandingRow = {
  kind: OutstandingKind;
  /** Identifiant de la vente ou de la commande. */
  id: string;
  customerName: string;
  /** Fiche client liée, si la créance en a une. */
  customerId: string | null;
  /** Date d'origine — sert au tri et à l'affichage de l'ancienneté. */
  occurredAt: string;
  total: string;
  paid: string;
  due: string;
};

export type OutstandingResult = {
  rows: OutstandingRow[];
  totalDue: string;
};

/** Seuil sous lequel un reliquat est un artefact d'arrondi, pas une créance. */
const EPSILON = 0.005;

/**
 * Mémoïsé par rendu (`react.cache`) : plusieurs blocs du tableau de bord
 * demandent les mêmes agrégats. Sans ça, chaque bloc rouvrait un aller-retour
 * vers une base distante, et l'écran attendait la même réponse deux fois.
 */
export const listOutstanding = cache(async (): Promise<OutstandingResult> => {
  const [sales, orders] = await Promise.all([
    prisma.sale.findMany({
      where: { remainingDue: { gt: 0 } },
      orderBy: { soldAt: "asc" },
      select: {
        id: true,
        customerName: true,
        customerId: true,
        soldAt: true,
        totalRevenue: true,
        remainingDue: true,
        customer: { select: { fullName: true } },
      },
    }),
    // Mêmes règles que la compta : une commande confirmée non encore
    // transformée en vente porte une créance dès qu'elle est partiellement
    // payée.
    prisma.order.findMany({
      where: { status: { in: ["READY", "DELIVERED"] }, sale: null },
      orderBy: { orderedAt: "asc" },
      select: {
        id: true,
        customerName: true,
        customerId: true,
        orderedAt: true,
        items: { select: { quantity: true, unitPrice: true } },
        payments: { select: { type: true, amount: true } },
        customer: { select: { fullName: true } },
      },
    }),
  ]);

  const rows: OutstandingRow[] = [];

  for (const s of sales) {
    const total = new Decimal(s.totalRevenue.toString());
    const due = new Decimal(s.remainingDue.toString());
    if (due.lessThanOrEqualTo(EPSILON)) continue;
    rows.push({
      kind: "sale",
      id: s.id,
      customerName: s.customer?.fullName ?? s.customerName ?? "Client anonyme",
      customerId: s.customerId,
      occurredAt: s.soldAt.toISOString(),
      total: total.toFixed(2),
      paid: total.minus(due).toFixed(2),
      due: due.toFixed(2),
    });
  }

  for (const o of orders) {
    const total = o.items.reduce(
      (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
      new Decimal(0),
    );
    const paid = o.payments.reduce((acc, p) => {
      const amount = new Decimal(p.amount.toString());
      return p.type === "REFUND" ? acc.minus(amount) : acc.plus(amount);
    }, new Decimal(0));
    const due = total.minus(paid);
    if (due.lessThanOrEqualTo(EPSILON)) continue;
    rows.push({
      kind: "order",
      id: o.id,
      customerName: o.customer?.fullName ?? o.customerName ?? "Client anonyme",
      customerId: o.customerId,
      occurredAt: o.orderedAt.toISOString(),
      total: total.toFixed(2),
      paid: paid.toFixed(2),
      due: due.toFixed(2),
    });
  }

  // Les plus anciennes d'abord : ce sont celles qu'on oublie.
  rows.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));

  const totalDue = rows.reduce((acc, r) => acc.plus(new Decimal(r.due)), new Decimal(0));
  return { rows, totalDue: totalDue.toFixed(2) };
})
