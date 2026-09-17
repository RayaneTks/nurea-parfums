import "server-only";
import { AMOUNT_POSITIVE_MESSAGE, type CashMovementKind, type MovementSummary } from "@/contracts/treasury";
import { DomainError } from "@/domain/errors";
import { newId } from "@/domain/ids";
import { eur, eurFromDb, formatEur, toDb, toWire, type Eur } from "@/domain/money";
import type { Tx } from "@/server/db/transaction";

/**
 * LE point d'écriture de `CashMovement` (03 §4.2 « L'INSERT physique dans CashMovement », 04 §4.3) : l'euro
 * s'écrit une fois, ici, appelé par les writers `payments`, `batches` et `treasury` avec la nature qui leur
 * appartient. Écriture seule (trigger `nurea_append_only`) : seul le libellé se modifie ensuite.
 *
 * Le signe est porté ICI (07 §3.0.3) : l'appelant dit le sens (`in`, `out`) et un montant positif. Gardes
 * communes à tout mouvement, vérifiées sur la ligne de poche verrouillée :
 * - la poche est verrouillée dans la transaction, en partage pour une entrée, EXCLUSIVEMENT pour une sortie
 *   (04 §4.2 : une poche en cours d'archivage ne reçoit rien ; deux sorties concurrentes lisent le solde
 *   l'une après l'autre) ;
 * - une poche archivée ne reçoit ni ne perd plus rien (03 §4.9 : son solde reste 0) ;
 * - « Non attribué » ne passe jamais sous zéro (03 §4.3 T5, T8, T11 ; 04 §4.2 : toute sortie qui la vise).
 */

export const POCKET_NOT_FOUND = "Cette poche n'existe plus. Choisis-en une autre.";
export const MOVEMENT_NOT_FOUND = "Ce mouvement n'existe plus. Recharge le journal pour voir sa version à jour.";
/** Message de 04 §9.3 (unicité de `reversesId`). */
export const ALREADY_REVERSED = "Ce mouvement a déjà été annulé.";
export const IS_REVERSAL = "Ce mouvement est lui-même une annulation : il ne s'annule pas.";

export function unassignedShortMessage(balance: Eur): string {
  return `« Non attribué » ne contient que ${formatEur(eur.clampZero(balance))} : il ne passe jamais sous zéro. Choisis une autre poche ou un montant plus petit.`;
}

const MOVEMENT_SELECT = {
  id: true,
  pocketId: true,
  kind: true,
  amount: true,
  occurredAt: true,
  label: true,
  reversesId: true,
  transferGroupId: true,
} as const;

export type StoredMovement = {
  id: string;
  pocketId: string;
  kind: CashMovementKind;
  /** Signé. */
  amount: Eur;
  occurredAt: Date;
  label: string | null;
  reversesId: string | null;
  transferGroupId: string | null;
};

type MovementRow = {
  id: string;
  pocketId: string;
  kind: CashMovementKind;
  amount: { toString(): string };
  occurredAt: Date;
  label: string | null;
  reversesId: string | null;
  transferGroupId: string | null;
};

function stored(row: MovementRow): StoredMovement {
  return { ...row, amount: eurFromDb(row.amount) };
}

export function movementSummary(movement: StoredMovement): MovementSummary {
  return {
    id: movement.id,
    pocketId: movement.pocketId,
    kind: movement.kind,
    amount: toWire(movement.amount),
    occurredAt: movement.occurredAt.toISOString(),
    label: movement.label,
    reversesId: movement.reversesId,
    transferGroupId: movement.transferGroupId,
  };
}

// ── Lectures ───────────────────────────────────────────────────────────────────

/** Solde = solde d'ouverture + Σ mouvements signés (03 §5.5), lu dans la transaction. */
export async function pocketBalance(tx: Tx, pocketId: string): Promise<Eur> {
  const pocket = await tx.db.pocket.findUnique({ where: { id: pocketId }, select: { openingBalance: true } });
  if (!pocket) throw new DomainError("NOT_FOUND", POCKET_NOT_FOUND);
  const sum = await tx.db.cashMovement.aggregate({ where: { pocketId }, _sum: { amount: true } });
  const movements = sum._sum.amount === null ? eur.zero : eurFromDb(sum._sum.amount);
  return eur.add(eurFromDb(pocket.openingBalance), movements);
}

/** Un mouvement, et celui qui l'annule s'il existe. */
export async function findMovement(tx: Tx, id: string): Promise<(StoredMovement & { reversedById: string | null }) | null> {
  const row = await tx.db.cashMovement.findUnique({
    where: { id },
    select: { ...MOVEMENT_SELECT, reversedBy: { select: { id: true } } },
  });
  if (!row) return null;
  const { reversedBy, ...movement } = row;
  return { ...stored(movement), reversedById: reversedBy?.id ?? null };
}

/** Les jambes d'un transfert (deux, sauf reprise d'un transfert incomplet). */
export async function findTransferLegs(tx: Tx, transferGroupId: string) {
  const rows = await tx.db.cashMovement.findMany({
    where: { transferGroupId },
    orderBy: [{ amount: "asc" }, { id: "asc" }],
    select: { ...MOVEMENT_SELECT, reversedBy: { select: { id: true } } },
  });
  return rows.map(({ reversedBy, ...movement }) => ({ ...stored(movement), reversedById: reversedBy?.id ?? null }));
}

// ── Gardes ─────────────────────────────────────────────────────────────────────

/** Le mouvement signé `amount` peut-il toucher cette poche ? Voir l'en-tête du fichier. */
async function assertPocketAccepts(tx: Tx, pocketId: string, amount: Eur): Promise<void> {
  const pocket = await tx.db.pocket.findUnique({
    where: { id: pocketId },
    select: { name: true, archived: true, isSystem: true },
  });
  if (!pocket) throw new DomainError("NOT_FOUND", POCKET_NOT_FOUND);
  const outflow = eur.isNegative(amount);
  const held = tx.lock.held("pockets", pocketId);
  if (held === null || (outflow && held !== "update")) {
    // Erreur de programmation : le writer appelant n'a pas pris le verrou (04 §4.2).
    throw new Error(
      `insertMovement : verrou ${outflow ? "exclusif" : "au moins partagé"} de la poche ${pocketId} non détenu (04 §4.2).`,
    );
  }
  if (pocket.archived) {
    throw new DomainError("CONFLICT", `La poche « ${pocket.name} » est archivée : aucun mouvement ne peut plus y entrer ni en sortir.`);
  }
  if (outflow && pocket.isSystem) {
    const balance = await pocketBalance(tx, pocketId);
    if (eur.isNegative(eur.add(balance, amount))) throw new DomainError("CONFLICT", unassignedShortMessage(balance));
  }
}

function signed(direction: "in" | "out", amount: Eur): Eur {
  if (eur.compare(amount, eur.zero) <= 0) throw new DomainError("VALIDATION", AMOUNT_POSITIVE_MESSAGE, "amount");
  return direction === "out" ? eur.neg(amount) : amount;
}

// ── Écritures ──────────────────────────────────────────────────────────────────

export type NewMovement = {
  /** Identifiant fourni pour un geste idempotent (04 §3.6) ; sinon `cuid()`. */
  id?: string;
  pocketId: string;
  /** Un transfert passe par `insertTransfer` (deux jambes appariées). */
  kind: Exclude<CashMovementKind, "TRANSFER">;
  direction: "in" | "out";
  /** Positif : le sens est `direction`. */
  amount: Eur;
  /** Date de valeur. */
  occurredAt: Date;
  label?: string | null;
};

/** Un mouvement : paiement (+ ou −), dépense (−), paiement fournisseur (−), ajustement (+ ou −). */
export async function insertMovement(tx: Tx, input: NewMovement): Promise<StoredMovement> {
  if ((input.kind === "EXPENSE" || input.kind === "SUPPLIER") && input.direction !== "out") {
    throw new Error(`insertMovement : un mouvement ${input.kind} sort de sa poche (03 §4.9 movement_outflow_sign_ck).`);
  }
  const amount = signed(input.direction, input.amount);
  await assertPocketAccepts(tx, input.pocketId, amount);
  const row = await tx.db.cashMovement.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      pocketId: input.pocketId,
      kind: input.kind,
      amount: toDb(amount),
      occurredAt: input.occurredAt,
      label: input.label ?? null,
    },
    select: MOVEMENT_SELECT,
  });
  return stored(row);
}

/**
 * T11 : les deux jambes d'un transfert, en une écriture (`createMany`, 03 §4.3), même `transferGroupId`,
 * même date de valeur. `id` : identifiant de la jambe de sortie ET du groupe (renvoi idempotent).
 * Rend [sortie, entrée].
 */
export async function insertTransfer(
  tx: Tx,
  input: { id?: string; fromPocketId: string; toPocketId: string; amount: Eur; occurredAt: Date; label?: string | null },
): Promise<[StoredMovement, StoredMovement]> {
  if (input.fromPocketId === input.toPocketId) throw new Error("insertTransfer : deux poches différentes attendues.");
  const outflow = signed("out", input.amount);
  await assertPocketAccepts(tx, input.fromPocketId, outflow);
  await assertPocketAccepts(tx, input.toPocketId, input.amount);
  const transferGroupId = input.id ?? newId();
  const common = { kind: "TRANSFER" as const, occurredAt: input.occurredAt, label: input.label ?? null, transferGroupId };
  const rows = await tx.db.cashMovement.createManyAndReturn({
    data: [
      { ...(input.id ? { id: input.id } : {}), pocketId: input.fromPocketId, amount: toDb(outflow), ...common },
      { pocketId: input.toPocketId, amount: toDb(input.amount), ...common },
    ],
    select: MOVEMENT_SELECT,
  });
  const legs = rows.map(stored);
  const out = legs.find((leg) => leg.pocketId === input.fromPocketId);
  const into = legs.find((leg) => leg.pocketId === input.toPocketId);
  if (!out || !into) throw new Error("insertTransfer : jambes du transfert introuvables après écriture.");
  return [out, into];
}

/**
 * Contre-passation (03 §4.4) : même nature, même poche, même date de valeur, montant opposé — ce que le
 * trigger `nurea_movement_consistency` exige au COMMIT. Un mouvement s'annule au plus une fois (unicité de
 * `reversesId`) et une annulation ne s'annule pas (sinon une chaîne d'annulations d'annulations rendrait le
 * journal illisible : on refait le geste). Une jambe de transfert reçoit le nouveau `transferGroupId` de la
 * contre-passation, commun à ses deux jambes.
 */
export async function insertReversal(
  tx: Tx,
  movementId: string,
  options: { transferGroupId?: string; label?: string | null } = {},
): Promise<StoredMovement> {
  const original = await findMovement(tx, movementId);
  if (!original) throw new DomainError("NOT_FOUND", MOVEMENT_NOT_FOUND);
  if (original.reversedById !== null) throw new DomainError("CONFLICT", ALREADY_REVERSED);
  if (original.reversesId !== null) throw new DomainError("CONFLICT", IS_REVERSAL);
  if ((original.kind === "TRANSFER") !== (options.transferGroupId !== undefined)) {
    throw new Error("insertReversal : un groupe de transfert est attendu pour une jambe de transfert, et seulement pour elle.");
  }
  const amount = eur.neg(original.amount);
  await assertPocketAccepts(tx, original.pocketId, amount);
  const row = await tx.db.cashMovement.create({
    data: {
      pocketId: original.pocketId,
      kind: original.kind,
      amount: toDb(amount),
      occurredAt: original.occurredAt,
      reversesId: original.id,
      transferGroupId: options.transferGroupId ?? null,
      label: options.label ?? null,
    },
    select: MOVEMENT_SELECT,
  });
  return stored(row);
}

/** Le libellé, seule colonne modifiable d'un mouvement (trigger `nurea_append_only('label')`). */
export async function setMovementLabel(tx: Tx, movementId: string, label: string | null): Promise<StoredMovement> {
  const current = await findMovement(tx, movementId);
  if (!current) throw new DomainError("NOT_FOUND", MOVEMENT_NOT_FOUND);
  if (current.label === label) return current;
  const row = await tx.db.cashMovement.update({ where: { id: movementId }, data: { label }, select: MOVEMENT_SELECT });
  return stored(row);
}
