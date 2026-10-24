import type { PrismaClient } from "@prisma/client";

/**
 * Jeu du carnet fournisseur (E22, docs/admin/dettes-fournisseur.md) : de quoi éprouver l'écran PLEIN —
 * un Reste à payer dû, une dette saisie à la main, une dette qui a coché un lot (S22 relit l'élément
 * coché), et un versement. Le carnet VIDE s'éprouve sur la base de PC-12 (`premiere-utilisation.spec.ts`).
 *
 * Aucun mouvement d'argent : le carnet n'en écrit jamais, le jeu non plus.
 */

/** Identifiants fixes : les adresses d'écran de `e2e/routes.ts` s'écrivent avant toute base. */
const cuid = (label: string) => `c${`e2e${label}`.replace(/[^a-z0-9]/g, "").padEnd(24, "0").slice(0, 24)}`;

export const SUPPLIER = {
  /** Dette qui a coché « Commande de mars » : S22 montre l'élément coché et son coût noté. */
  debtWithItems: { id: cuid("dettelotmars"), label: "Lot de mars", amount: "92700.00" },
  /** Dette saisie à la main, sans élément coché. */
  debtManual: { id: cuid("dettetransport"), label: "Transport", amount: "8500.00" },
  /** Versement partiel : le reste « pour la prochaine fois ». */
  payment: { id: cuid("versementespeces"), label: "En main propre", amount: "60000.00" },
} as const;

const DAY = 24 * 60 * 60 * 1000;

export async function seedSupplier(db: PrismaClient, ctx: { batchId: string }): Promise<void> {
  const now = Date.now();
  await db.supplierEntry.create({
    data: {
      id: SUPPLIER.debtWithItems.id,
      kind: "DEBT",
      amountDzd: SUPPLIER.debtWithItems.amount,
      label: SUPPLIER.debtWithItems.label,
      occurredAt: new Date(now - 20 * DAY),
      note: "Payé la moitié à la livraison, le reste au prochain lot.",
      items: { create: [{ batchId: ctx.batchId, amountDzd: SUPPLIER.debtWithItems.amount }] },
    },
  });
  await db.supplierEntry.create({
    data: {
      id: SUPPLIER.debtManual.id,
      kind: "DEBT",
      amountDzd: SUPPLIER.debtManual.amount,
      label: SUPPLIER.debtManual.label,
      occurredAt: new Date(now - 12 * DAY),
    },
  });
  await db.supplierEntry.create({
    data: {
      id: SUPPLIER.payment.id,
      kind: "PAYMENT",
      amountDzd: SUPPLIER.payment.amount,
      label: SUPPLIER.payment.label,
      occurredAt: new Date(now - 3 * DAY),
    },
  });
}
