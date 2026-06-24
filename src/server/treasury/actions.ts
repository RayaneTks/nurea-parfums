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
