"use server";

import { Prisma, type PocketKind } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { tagFor } from "@/lib/admin/cache-tags";
import type { ActionResult } from "@/server/customers/actions";
import { ensureUnassignedPocket, transfer, recordMovement } from "./movements";

const KINDS: PocketKind[] = ["CASH", "BANK", "SUPPLIER", "OTHER"];

function revalidate() {
  revalidateTag(tagFor.treasury(), "default");
}

function parseAmount(value: unknown): number | null {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function createPocketAction(input: {
  name?: string;
  kind?: PocketKind;
  openingBalance?: number | string;
}): Promise<ActionResult<{ id: string }>> {
  const name = input.name?.trim();
  if (!name || name.length < 2) return { ok: false, error: "Nom requis (2 caractères min)." };
  const kind = input.kind && KINDS.includes(input.kind) ? input.kind : "OTHER";
  const opening = parseAmount(input.openingBalance ?? 0);
  if (opening === null || opening < 0) return { ok: false, error: "Solde d'ouverture invalide." };

  const count = await prisma.pocket.count({ where: { archived: false } });
  const pocket = await prisma.pocket.create({
    data: {
      name,
      kind,
      openingBalance: new Prisma.Decimal(opening),
      sortOrder: count,
    },
    select: { id: true },
  });
  revalidate();
  return { ok: true, data: { id: pocket.id } };
}

export async function renamePocketAction(input: {
  id: string;
  name?: string;
  kind?: PocketKind;
}): Promise<ActionResult<{ id: string }>> {
  const name = input.name?.trim();
  if (!name || name.length < 2) return { ok: false, error: "Nom requis (2 caractères min)." };
  const pocket = await prisma.pocket.findUnique({
    where: { id: input.id },
    select: { isSystem: true },
  });
  if (!pocket) return { ok: false, error: "Poche introuvable." };
  if (pocket.isSystem) return { ok: false, error: "La poche « Non attribué » n'est pas modifiable." };

  await prisma.pocket.update({
    where: { id: input.id },
    data: {
      name,
      ...(input.kind && KINDS.includes(input.kind) ? { kind: input.kind } : {}),
    },
  });
  revalidate();
  return { ok: true, data: { id: input.id } };
}

export async function archivePocketAction(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  const pocket = await prisma.pocket.findUnique({
    where: { id: input.id },
    select: { isSystem: true },
  });
  if (!pocket) return { ok: false, error: "Poche introuvable." };
  if (pocket.isSystem) return { ok: false, error: "La poche « Non attribué » ne peut pas être archivée." };

  await prisma.pocket.update({ where: { id: input.id }, data: { archived: true } });
  revalidate();
  return { ok: true, data: { id: input.id } };
}

export async function transferAction(input: {
  fromPocketId?: string;
  toPocketId?: string;
  amount?: number | string;
  label?: string;
}): Promise<ActionResult<{ groupId: string }>> {
  const amount = parseAmount(input.amount);
  if (!input.fromPocketId || !input.toPocketId) return { ok: false, error: "Poches requises." };
  if (input.fromPocketId === input.toPocketId) return { ok: false, error: "Choisis deux poches différentes." };
  if (amount === null || amount <= 0) return { ok: false, error: "Montant invalide (> 0)." };

  const groupId = await transfer({
    fromPocketId: input.fromPocketId,
    toPocketId: input.toPocketId,
    amount,
    label: input.label?.trim() || "Transfert",
  });
  revalidate();
  return { ok: true, data: { groupId } };
}

/** Répartit tout ou partie du « Non attribué » vers une poche réelle (= transfert). */
export async function assignUnattributedAction(input: {
  toPocketId?: string;
  amount?: number | string;
}): Promise<ActionResult<{ groupId: string }>> {
  const amount = parseAmount(input.amount);
  if (!input.toPocketId) return { ok: false, error: "Poche de destination requise." };
  if (amount === null || amount <= 0) return { ok: false, error: "Montant invalide (> 0)." };
  const systemId = await ensureUnassignedPocket();
  if (input.toPocketId === systemId) return { ok: false, error: "Choisis une poche réelle." };

  const groupId = await transfer({
    fromPocketId: systemId,
    toPocketId: input.toPocketId,
    amount,
    label: "Répartition",
  });
  revalidate();
  return { ok: true, data: { groupId } };
}

/** Ajustement manuel (correction d'inventaire). Montant signé (+ ou −). */
export async function adjustmentAction(input: {
  pocketId?: string;
  amount?: number | string;
  label?: string;
}): Promise<ActionResult<{ id: string }>> {
  const amount = parseAmount(input.amount);
  if (!input.pocketId) return { ok: false, error: "Poche requise." };
  if (amount === null || amount === 0) return { ok: false, error: "Montant invalide (≠ 0)." };

  const mv = await recordMovement({
    pocketId: input.pocketId,
    amount,
    kind: "ADJUSTMENT",
    label: input.label?.trim() || "Ajustement",
  });
  revalidate();
  return { ok: true, data: { id: mv.id } };
}

/**
 * Avance fournisseur — déplace l'argent depuis une poche réelle (Revolut/Cash…)
 * vers la poche SUPPLIER (avance). S'il n'y a pas de poche SUPPLIER, retombe sur
 * un SUPPLIER_OUT classique (sortie sèche).
 */
export async function supplierPaymentAction(input: {
  pocketId?: string | null;
  amount?: number | string;
  label?: string;
  refId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) return { ok: false, error: "Montant invalide (> 0)." };

  const supplier = await prisma.pocket.findFirst({
    where: { archived: false, kind: "SUPPLIER" },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });

  if (supplier && input.pocketId && supplier.id !== input.pocketId) {
    // Vraie avance : sort de la poche source, entre en avance chez le fournisseur.
    const groupId = await transfer({
      fromPocketId: input.pocketId,
      toPocketId: supplier.id,
      amount,
      label: input.label?.trim() || "Avance fournisseur",
    });
    revalidate();
    return { ok: true, data: { id: groupId } };
  }

  const mv = await recordMovement({
    pocketId: input.pocketId ?? null,
    amount,
    kind: "SUPPLIER_OUT",
    label: input.label?.trim() || "Paiement fournisseur",
    refType: input.refId ? "Batch" : null,
    refId: input.refId ?? null,
  });
  revalidate();
  return { ok: true, data: { id: mv.id } };
}

/**
 * Importe l'historique dans la poche « Non attribué », à répartir. Idempotent :
 * ignore toute origine ayant déjà un mouvement.
 *
 * Règle anti-double-comptage (identique au chemin live) : l'argent d'une commande
 * est tracé UNE seule fois, via ses paiements (DEPOSIT/BALANCE). Donc :
 *  - ventes DIRECTES (sans commande liée) → SALE_IN sur l'encaissé ;
 *  - toute commande (livrée ou à traiter) → ses paiements, qu'elle ait ou non une vente liée ;
 *  - une vente issue d'une commande (`orderId`) n'apporte AUCUN mouvement (déjà couvert
 *    par les paiements de la commande).
 */
export async function backfillTreasuryAction(): Promise<ActionResult<{ created: number }>> {
  const unassigned = await ensureUnassignedPocket();
  const existing = await prisma.cashMovement.findMany({
    where: { refId: { not: null } },
    select: { refType: true, refId: true },
  });
  const has = new Set(existing.map((m) => `${m.refType}:${m.refId}`));
  let created = 0;

  // Ventes directes uniquement : les ventes issues d'une commande sont couvertes
  // par les paiements de cette commande (boucle ci-dessous).
  const sales = await prisma.sale.findMany({
    where: { orderId: null },
    select: { id: true, soldAt: true, totalRevenue: true, totalCost: true, remainingDue: true },
  });
  for (const s of sales) {
    if (!has.has(`Sale:${s.id}`)) {
      const cashed = Number(s.totalRevenue) - Number(s.remainingDue);
      if (cashed > 0.005) {
        await recordMovement({
          pocketId: unassigned,
          amount: cashed,
          kind: "SALE_IN",
          label: "Vente (historique)",
          refType: "Sale",
          refId: s.id,
          occurredAt: s.soldAt,
        });
        created += 1;
      }
    }
    // Coût de revient = sortie de trésorerie (achat du stock vendu).
    if (!has.has(`SaleCost:${s.id}`) && Number(s.totalCost) > 0.005) {
      await recordMovement({
        pocketId: unassigned,
        amount: Number(s.totalCost),
        kind: "SUPPLIER_OUT",
        label: "Coût d'achat (historique)",
        refType: "SaleCost",
        refId: s.id,
        occurredAt: s.soldAt,
      });
      created += 1;
    }
  }

  // Toutes les commandes confirmées : leurs paiements sont la source de vérité du cash,
  // qu'elles aient été finalisées en vente ou non.
  const orders = await prisma.order.findMany({
    where: { status: { in: ["READY", "DELIVERED"] } },
    select: {
      id: true,
      orderedAt: true,
      items: { select: { unitCost: true, quantity: true } },
      payments: { select: { id: true, type: true, amount: true, paidAt: true } },
    },
  });
  for (const o of orders) {
    for (const pay of o.payments) {
      if (has.has(`PaymentTransaction:${pay.id}`)) continue;
      const kind =
        pay.type === "DEPOSIT" ? "DEPOSIT_IN" : pay.type === "BALANCE" ? "BALANCE_IN" : "REFUND_OUT";
      await recordMovement({
        pocketId: unassigned,
        amount: Number(pay.amount),
        kind,
        label: "Encaissement commande (historique)",
        refType: "PaymentTransaction",
        refId: pay.id,
        occurredAt: pay.paidAt,
      });
      created += 1;
    }
    // Coût de revient de la commande = sortie de trésorerie (achat du stock).
    if (!has.has(`OrderCost:${o.id}`)) {
      const cost = o.items.reduce((acc, it) => acc + Number(it.unitCost) * it.quantity, 0);
      if (cost > 0.005) {
        await recordMovement({
          pocketId: unassigned,
          amount: cost,
          kind: "SUPPLIER_OUT",
          label: "Coût d'achat (historique)",
          refType: "OrderCost",
          refId: o.id,
          occurredAt: o.orderedAt,
        });
        created += 1;
      }
    }
  }

  const expenses = await prisma.batchExpense.findMany({
    select: { id: true, amount: true, occurredAt: true, label: true },
  });
  for (const e of expenses) {
    if (has.has(`BatchExpense:${e.id}`)) continue;
    await recordMovement({
      pocketId: unassigned,
      amount: Number(e.amount),
      kind: "EXPENSE_OUT",
      label: e.label || "Dépense (historique)",
      refType: "BatchExpense",
      refId: e.id,
      occurredAt: e.occurredAt,
    });
    created += 1;
  }

  revalidate();
  return { ok: true, data: { created } };
}
