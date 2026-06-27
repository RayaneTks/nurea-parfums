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

/** Paiement fournisseur / sortie d'avance depuis une poche. */
export async function supplierPaymentAction(input: {
  pocketId?: string | null;
  amount?: number | string;
  label?: string;
  refId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) return { ok: false, error: "Montant invalide (> 0)." };

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
 * Importe l'historique (ventes encaissées, acomptes/soldes des commandes
 * confirmées sans vente, dépenses) dans la poche « Non attribué », à répartir.
 * Idempotent : ignore toute origine ayant déjà un mouvement.
 */
export async function backfillTreasuryAction(): Promise<ActionResult<{ created: number }>> {
  const unassigned = await ensureUnassignedPocket();
  const existing = await prisma.cashMovement.findMany({
    where: { refId: { not: null } },
    select: { refType: true, refId: true },
  });
  const has = new Set(existing.map((m) => `${m.refType}:${m.refId}`));
  let created = 0;

  const sales = await prisma.sale.findMany({
    select: { id: true, soldAt: true, totalRevenue: true, remainingDue: true },
  });
  for (const s of sales) {
    if (has.has(`Sale:${s.id}`)) continue;
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

  const orders = await prisma.order.findMany({
    where: { status: { in: ["READY", "DELIVERED"] }, sale: null },
    select: { payments: { select: { id: true, type: true, amount: true, paidAt: true } } },
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
