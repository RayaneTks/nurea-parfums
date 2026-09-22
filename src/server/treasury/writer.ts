import "server-only";
import {
  SAME_POCKET_MESSAGE,
  futureDateMessage,
  valueDateOf,
  type AdjustData,
  type CreatePocketData,
  type MovementResult,
  type PocketBalance,
  type PocketDeletion,
  type PocketSummary,
  type ReversalResult,
  type SupplierPaymentData,
  type TransferData,
  type TransferResult,
  type UpdatePocketData,
} from "@/contracts/treasury";
import { DomainError, NeedsConfirmation } from "@/domain/errors";
import { newId } from "@/domain/ids";
import { eur, eurFromDb, eurFromWire, formatEur, toDb, toWire, type MoneyString } from "@/domain/money";
import type { Tx } from "@/server/db/transaction";
import * as settingsWriter from "@/server/settings/writer";
import * as movements from "@/server/treasury/movements";

/**
 * Seul fichier qui écrit `Pocket` (03 §4.2, 04 §4.3), et le corps des transactions du module trésorerie :
 * T11 (transfert, « Répartir le non attribué »), T12 (annuler un mouvement manuel), T15 (archiver une poche),
 * ajustement et paiement fournisseur (écritures d'une ligne), création, modification et suppression de poche.
 * Les mouvements eux-mêmes sont écrits par `treasury/movements.ts`, qui porte les gardes communes (verrou,
 * poche archivée, « Non attribué » jamais négatif).
 *
 * Comme dans `documents/writer.ts`, chaque fonction exportée est le corps complet de sa transaction : verrous,
 * lectures, gardes et réserves, puis écritures.
 */

/**
 * Identifiant de la poche « Non attribué » quand le serveur doit la créer (base neuve : la reprise la crée
 * sinon, 03 §7.7). Fixe : deux créations concurrentes butent sur la clé primaire et la seconde est rejouée
 * (04 §3.6) au lieu d'échouer sur l'index `pocket_single_system_uq`.
 */
export const SYSTEM_POCKET_ID = "poche-non-attribue";
export const SYSTEM_POCKET_NAME = "Non attribué";
/** Toujours en dernier dans les chips et les listes (06 S02 zone 3). */
const SYSTEM_SORT_ORDER = 999;

const SYSTEM_NOT_EDITABLE = "La poche « Non attribué » ne se renomme pas et reste en dernier.";
const SYSTEM_NOT_ARCHIVABLE = "La poche « Non attribué » ne s'archive pas : elle reçoit ce qui n'est pas encore rangé.";
const SYSTEM_NOT_DELETABLE = "La poche « Non attribué » ne se supprime pas.";
/** Message de 04 §3.4 et §9.3. */
export const POCKET_HAS_HISTORY = "Cette poche a un historique : archive-la une fois son solde à 0.";
const PAYMENT_MOVEMENT = "Ce mouvement vient d'un paiement : annule le paiement depuis la fiche du document.";
const EXPENSE_MOVEMENT = "Ce mouvement vient d'une dépense : supprime la dépense depuis la fiche du lot.";

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

// ── « Non attribué » ───────────────────────────────────────────────────────────

/** La poche système, créée à la première demande si la base n'en a pas. */
export async function unassignedPocketId(tx: Tx): Promise<string> {
  const existing = await tx.db.pocket.findFirst({ where: { isSystem: true }, select: { id: true } });
  if (existing) return existing.id;
  const created = await tx.db.pocket.create({
    data: {
      id: SYSTEM_POCKET_ID,
      name: SYSTEM_POCKET_NAME,
      kind: "UNASSIGNED",
      isSystem: true,
      sortOrder: SYSTEM_SORT_ORDER,
    },
    select: { id: true },
  });
  return created.id;
}

/** Poche choisie, ou « Non attribué » pour `null` (03 §3). À appeler AVANT de verrouiller. */
export async function resolvePocketId(tx: Tx, pocketId: string | null): Promise<string> {
  return pocketId ?? unassignedPocketId(tx);
}

// ── Lectures ───────────────────────────────────────────────────────────────────

const POCKET_SELECT = {
  id: true,
  name: true,
  kind: true,
  isSystem: true,
  archived: true,
  sortOrder: true,
  openingBalance: true,
} as const;

async function readPocket(tx: Tx, id: string) {
  const pocket = await tx.db.pocket.findUnique({ where: { id }, select: POCKET_SELECT });
  if (!pocket) throw new DomainError("NOT_FOUND", movements.POCKET_NOT_FOUND);
  return pocket;
}

export async function pocketSummary(tx: Tx, id: string): Promise<PocketSummary> {
  const pocket = await readPocket(tx, id);
  const settings = await settingsWriter.readSettings(tx);
  return {
    ...pocket,
    openingBalance: toWire(eurFromDb(pocket.openingBalance)),
    balance: toWire(await movements.pocketBalance(tx, id)),
    isDefault: pocket.isSystem ? settings.defaultPocketId === null : settings.defaultPocketId === id,
  };
}

async function balanceOf(tx: Tx, pocketId: string): Promise<PocketBalance> {
  return { pocketId, balance: toWire(await movements.pocketBalance(tx, pocketId)) };
}

// ── Poches ─────────────────────────────────────────────────────────────────────

/** Créer une poche (S16). Un id déjà connu rend la poche existante (04 §3.6). */
export async function createPocket(tx: Tx, input: CreatePocketData): Promise<PocketSummary> {
  if (input.id && (await tx.db.pocket.findUnique({ where: { id: input.id }, select: { id: true } }))) {
    return pocketSummary(tx, input.id);
  }
  const last = await tx.db.pocket.aggregate({ where: { isSystem: false }, _max: { sortOrder: true } });
  const created = await tx.db.pocket.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      kind: input.kind,
      openingBalance: toDb(eurFromWire(input.openingBalance)),
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
  if (input.makeDefault) await settingsWriter.rememberPocket(tx, created.id);
  return pocketSummary(tx, created.id);
}

/**
 * Renommer, changer de nature, réordonner (S14, S21). `position` : rang parmi les poches actives hors
 * « Non attribué » ; les autres poches sont renumérotées en conséquence (ordre total, sans trou).
 */
export async function updatePocket(tx: Tx, input: UpdatePocketData): Promise<PocketSummary> {
  const { pockets } = await tx.lock({ pockets: { update: [input.id] } });
  if (pockets.length === 0) throw new DomainError("NOT_FOUND", movements.POCKET_NOT_FOUND);
  const pocket = await readPocket(tx, input.id);
  if (pocket.isSystem) throw new DomainError("CONFLICT", SYSTEM_NOT_EDITABLE);

  const data = {
    ...(input.name !== undefined && input.name !== pocket.name ? { name: input.name } : {}),
    ...(input.kind !== undefined && input.kind !== pocket.kind ? { kind: input.kind } : {}),
  };
  if (Object.keys(data).length > 0) {
    await tx.db.pocket.update({ where: { id: pocket.id }, data, select: { id: true } });
  }

  if (input.position !== undefined) {
    if (pocket.archived) {
      throw new DomainError("CONFLICT", `La poche « ${pocket.name} » est archivée : elle n'apparaît plus dans l'ordre des poches.`);
    }
    const active = await tx.db.pocket.findMany({
      where: { isSystem: false, archived: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      select: { id: true, sortOrder: true },
    });
    const others = active.filter((candidate) => candidate.id !== pocket.id);
    const ordered = [...others];
    ordered.splice(Math.min(input.position, others.length), 0, { id: pocket.id, sortOrder: pocket.sortOrder });
    for (const [rank, candidate] of ordered.entries()) {
      if (candidate.sortOrder !== rank) {
        await tx.db.pocket.update({ where: { id: candidate.id }, data: { sortOrder: rank }, select: { id: true } });
      }
    }
  }
  return pocketSummary(tx, pocket.id);
}

/**
 * T15 — archiver (S14) : poche non système, solde nul exigé, verrou exclusif (un mouvement en cours d'écriture,
 * qui tient le verrou partagé, termine avant). Une poche archivée ne reçoit plus rien et cesse d'être proposée
 * par défaut. Déjà archivée : succès sans écriture.
 */
export async function archivePocket(tx: Tx, id: string): Promise<PocketSummary> {
  const { pockets } = await tx.lock({ pockets: { update: [id] } });
  if (pockets.length === 0) throw new DomainError("NOT_FOUND", movements.POCKET_NOT_FOUND);
  const pocket = await readPocket(tx, id);
  if (pocket.isSystem) throw new DomainError("CONFLICT", SYSTEM_NOT_ARCHIVABLE);
  if (pocket.archived) return pocketSummary(tx, id);
  const balance = await movements.pocketBalance(tx, id);
  if (!eur.isZero(balance)) {
    throw new DomainError(
      "CONFLICT",
      `Solde non nul : la poche « ${pocket.name} » contient ${formatEur(balance)}. Transfère d'abord son solde, puis archive-la.`,
    );
  }
  await tx.db.pocket.update({ where: { id }, data: { archived: true }, select: { id: true } });
  await settingsWriter.forgetPocket(tx, id);
  return pocketSummary(tx, id);
}

/**
 * Supprimer une poche créée par erreur (S14, 03 §4.4) : non système et SANS AUCUN mouvement — son solde
 * d'ouverture sort alors de la Trésorerie (la confirmation le dit). `Setting.defaultPocketId` repasse à NULL
 * par la clé `SetNull`. Déjà absente : succès (renvoi après coupure).
 */
export async function deletePocket(tx: Tx, id: string): Promise<PocketDeletion> {
  const { pockets } = await tx.lock({ pockets: { update: [id] } });
  if (pockets.length === 0) return { id, deleted: false };
  const pocket = await readPocket(tx, id);
  if (pocket.isSystem) throw new DomainError("CONFLICT", SYSTEM_NOT_DELETABLE);
  if ((await tx.db.cashMovement.count({ where: { pocketId: id } })) > 0) {
    throw new DomainError("CONFLICT", POCKET_HAS_HISTORY);
  }
  await tx.db.pocket.delete({ where: { id }, select: { id: true } });
  return { id, deleted: true };
}

// ── Mouvements manuels ─────────────────────────────────────────────────────────

function valueDate(chosen: Date | null | undefined, now: Date): Date {
  const date = valueDateOf(chosen, now);
  if (date === null) throw new DomainError("VALIDATION", futureDateMessage("mouvement"), "occurredAt");
  return date;
}

async function transferReplay(tx: Tx, id: string): Promise<TransferResult | null> {
  const movement = await movements.findMovement(tx, id);
  if (!movement) return null;
  if (movement.kind !== "TRANSFER" || movement.transferGroupId === null) {
    throw new DomainError("CONFLICT", "Cet identifiant est déjà pris par un autre mouvement : recharge la page et réessaie.");
  }
  const legs = await movements.findTransferLegs(tx, movement.transferGroupId);
  const out = legs.find((leg) => leg.id === id) ?? movement;
  const into = legs.find((leg) => leg.id !== id) ?? movement;
  return {
    transferGroupId: movement.transferGroupId,
    movements: [movements.movementSummary(out), movements.movementSummary(into)],
    from: await balanceOf(tx, out.pocketId),
    to: await balanceOf(tx, into.pocketId),
  };
}

/**
 * T11 — transfert (S15), ou « Répartir le non attribué » (`fromPocketId` null). Source verrouillée
 * exclusivement, destination en partage. « Non attribué » ne passe jamais sous zéro (`CONFLICT`) ; une autre
 * poche qui passerait en négatif est une réserve à confirmer.
 */
export async function transfer(tx: Tx, input: TransferData): Promise<TransferResult> {
  if (input.id) {
    const replay = await transferReplay(tx, input.id);
    if (replay) return replay;
  }
  const fromId = await resolvePocketId(tx, input.fromPocketId);
  if (fromId === input.toPocketId) throw new DomainError("VALIDATION", SAME_POCKET_MESSAGE, "toPocketId");
  const { pockets } = await tx.lock({ pockets: { update: [fromId], share: [input.toPocketId] } });
  if (pockets.length < 2) throw new DomainError("NOT_FOUND", movements.POCKET_NOT_FOUND);
  if (input.id) {
    const replay = await transferReplay(tx, input.id);
    if (replay) return replay;
  }

  const occurredAt = valueDate(input.occurredAt, tx.now);
  const amount = eurFromWire(input.amount);
  const source = await readPocket(tx, fromId);
  const destination = await readPocket(tx, input.toPocketId);
  for (const pocket of [source, destination]) {
    if (pocket.archived) {
      throw new DomainError("CONFLICT", `La poche « ${pocket.name} » est archivée : aucun mouvement ne peut plus y entrer ni en sortir.`);
    }
  }
  const balance = await movements.pocketBalance(tx, fromId);
  const after = eur.sub(balance, amount);
  if (eur.isNegative(after)) {
    if (source.isSystem) throw new DomainError("CONFLICT", movements.unassignedShortMessage(balance));
    if (!input.confirm) {
      throw new NeedsConfirmation(
        `Mettre « ${source.name} » en négatif ?`,
        [`« ${source.name} » contient ${formatEur(balance)} : son solde passera à ${formatEur(after)}.`],
        "Transférer",
      );
    }
  }

  const [out, into] = await movements.insertTransfer(tx, {
    id: input.id,
    fromPocketId: fromId,
    toPocketId: input.toPocketId,
    amount,
    occurredAt,
    label: input.label ?? null,
  });
  return {
    transferGroupId: out.transferGroupId as string,
    movements: [movements.movementSummary(out), movements.movementSummary(into)],
    from: await balanceOf(tx, fromId),
    to: await balanceOf(tx, input.toPocketId),
  };
}

async function movementReplay(tx: Tx, id: string, kind: "ADJUSTMENT" | "SUPPLIER"): Promise<MovementResult | null> {
  const movement = await movements.findMovement(tx, id);
  if (!movement) return null;
  if (movement.kind !== kind) {
    throw new DomainError("CONFLICT", "Cet identifiant est déjà pris par un autre mouvement : recharge la page et réessaie.");
  }
  return { movement: movements.movementSummary(movement), pocket: await balanceOf(tx, movement.pocketId) };
}

/** Écriture d'une ligne (ajustement, paiement fournisseur) : poche verrouillée selon le sens, rejeu par id. */
async function singleMovement(
  tx: Tx,
  input: { id?: string; pocketId: string | null; occurredAt?: Date | null; amount: MoneyString },
  movement: { kind: "ADJUSTMENT" | "SUPPLIER"; direction: "in" | "out"; label: string | null },
): Promise<MovementResult> {
  if (input.id) {
    const replay = await movementReplay(tx, input.id, movement.kind);
    if (replay) return replay;
  }
  const pocketId = await resolvePocketId(tx, input.pocketId);
  const mode = movement.direction === "out" ? { update: [pocketId] } : { share: [pocketId] };
  const { pockets } = await tx.lock({ pockets: mode });
  if (pockets.length === 0) throw new DomainError("NOT_FOUND", movements.POCKET_NOT_FOUND);
  if (input.id) {
    const replay = await movementReplay(tx, input.id, movement.kind);
    if (replay) return replay;
  }
  const written = await movements.insertMovement(tx, {
    id: input.id,
    pocketId,
    kind: movement.kind,
    direction: movement.direction,
    amount: eurFromWire(input.amount),
    occurredAt: valueDate(input.occurredAt, tx.now),
    label: movement.label,
  });
  return { movement: movements.movementSummary(written), pocket: await balanceOf(tx, pocketId) };
}

/** Ajustement signé (S15) : « Ajouter » ou « Retirer », la raison devient le libellé. */
export function adjust(tx: Tx, input: AdjustData): Promise<MovementResult> {
  return singleMovement(tx, input, { kind: "ADJUSTMENT", direction: input.direction, label: input.reason });
}

/** Paiement fournisseur (S15) : sortie, sans effet sur la Marge nette (03 §5.4). */
export function recordSupplierPayment(tx: Tx, input: SupplierPaymentData): Promise<MovementResult> {
  return singleMovement(tx, input, { kind: "SUPPLIER", direction: "out", label: input.note ?? null });
}

/**
 * T12 — annuler un mouvement manuel (E04, S14) : transfert (les deux jambes, nouveau `transferGroupId`),
 * ajustement, paiement fournisseur. Un paiement s'annule depuis sa fiche (T8), une dépense depuis son lot
 * (T10) : leur pièce doit suivre. Poches verrouillées exclusivement : une contre-passation peut vider
 * « Non attribué ».
 */
export async function reverseMovement(tx: Tx, movementId: string): Promise<ReversalResult> {
  const target = await movements.findMovement(tx, movementId);
  if (!target) throw new DomainError("NOT_FOUND", movements.MOVEMENT_NOT_FOUND);
  if (target.kind === "PAYMENT") throw new DomainError("CONFLICT", PAYMENT_MOVEMENT);
  if (target.kind === "EXPENSE") throw new DomainError("CONFLICT", EXPENSE_MOVEMENT);

  const readLegs = () =>
    target.kind === "TRANSFER" && target.transferGroupId !== null
      ? movements.findTransferLegs(tx, target.transferGroupId)
      : movements.findMovement(tx, movementId).then((movement) => (movement ? [movement] : []));

  const pocketIds = unique((await readLegs()).map((leg) => leg.pocketId));
  await tx.lock({ pockets: { update: pocketIds } });
  const legs = await readLegs();
  if (legs.some((leg) => leg.reversedById !== null)) throw new DomainError("CONFLICT", movements.ALREADY_REVERSED);
  if (legs.some((leg) => leg.reversesId !== null)) throw new DomainError("CONFLICT", movements.IS_REVERSAL);

  const transferGroupId = target.kind === "TRANSFER" ? newId() : undefined;
  const written = [];
  for (const leg of legs) {
    written.push(await movements.insertReversal(tx, leg.id, { transferGroupId, label: leg.label }));
  }
  const pockets: PocketBalance[] = [];
  for (const id of pocketIds) pockets.push(await balanceOf(tx, id));
  return { reversedIds: legs.map((leg) => leg.id), movements: written.map(movements.movementSummary), pockets };
}
