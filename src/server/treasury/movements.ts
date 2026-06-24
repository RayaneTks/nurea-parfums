import { randomUUID } from "node:crypto";
import { Prisma, type CashMovementKind, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Client Prisma ou client transactionnel (pour atomicité dans une plus grande transaction). */
type Db = PrismaClient | Prisma.TransactionClient;

const OUT_KINDS = new Set<CashMovementKind>(["REFUND_OUT", "EXPENSE_OUT", "SUPPLIER_OUT"]);
const IN_KINDS = new Set<CashMovementKind>([
  "OPENING",
  "SALE_IN",
  "DEPOSIT_IN",
  "BALANCE_IN",
]);

/**
 * Signe le montant selon le type de mouvement.
 * - Entrées (IN_KINDS) → positif ; sorties (OUT_KINDS) → négatif (magnitude attendue positive).
 * - TRANSFER / ADJUSTMENT → le montant est déjà signé par l'appelant.
 */
export function signedAmount(kind: CashMovementKind, magnitude: Prisma.Decimal.Value): Prisma.Decimal {
  const d = new Prisma.Decimal(magnitude);
  if (OUT_KINDS.has(kind)) return d.abs().negated();
  if (IN_KINDS.has(kind)) return d.abs();
  return d; // TRANSFER / ADJUSTMENT
}

/**
 * Garantit l'existence de la poche système « Non attribué » et renvoie son id.
 * Idempotent : crée la poche au premier appel.
 */
export async function ensureUnassignedPocket(db: Db = prisma): Promise<string> {
  const existing = await db.pocket.findFirst({
    where: { isSystem: true, kind: "UNASSIGNED" },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.pocket.create({
    data: {
      name: "Non attribué",
      kind: "UNASSIGNED",
      isSystem: true,
      sortOrder: 999,
    },
    select: { id: true },
  });
  return created.id;
}

type RecordMovementInput = {
  /** null → poche « Non attribué » (jamais bloquant). */
  pocketId: string | null;
  /** Magnitude positive pour les kinds IN/OUT ; montant signé pour TRANSFER/ADJUSTMENT. */
  amount: Prisma.Decimal.Value;
  kind: CashMovementKind;
  label?: string | null;
  refType?: string | null;
  refId?: string | null;
  occurredAt?: Date;
  createdById?: string | null;
  transferGroupId?: string | null;
};

/** Enregistre un mouvement de trésorerie. Route vers « Non attribué » si pocketId absent. */
export async function recordMovement(input: RecordMovementInput, db: Db = prisma) {
  const pocketId = input.pocketId ?? (await ensureUnassignedPocket(db));
  return db.cashMovement.create({
    data: {
      pocketId,
      amount: signedAmount(input.kind, input.amount),
      kind: input.kind,
      label: input.label ?? null,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      createdById: input.createdById ?? null,
      transferGroupId: input.transferGroupId ?? null,
    },
  });
}

/**
 * Contre-passe (supprime) les mouvements liés à une origine — utilisé quand la source
 * disparaît (vente/dépense supprimée). La suppression retire bien l'argent du solde.
 */
export async function reverseMovementsFor(refType: string, refId: string, db: Db = prisma) {
  await db.cashMovement.deleteMany({ where: { refType, refId } });
}

type TransferInput = {
  fromPocketId: string;
  toPocketId: string;
  amount: Prisma.Decimal.Value;
  label?: string | null;
  createdById?: string | null;
};

/** Transfert entre deux poches : 2 mouvements TRANSFER liés par transferGroupId. */
export async function transfer(input: TransferInput, db: Db = prisma) {
  const groupId = randomUUID();
  const magnitude = new Prisma.Decimal(input.amount).abs();
  await db.cashMovement.createMany({
    data: [
      {
        pocketId: input.fromPocketId,
        amount: magnitude.negated(),
        kind: "TRANSFER",
        label: input.label ?? "Transfert",
        transferGroupId: groupId,
        createdById: input.createdById ?? null,
      },
      {
        pocketId: input.toPocketId,
        amount: magnitude,
        kind: "TRANSFER",
        label: input.label ?? "Transfert",
        transferGroupId: groupId,
        createdById: input.createdById ?? null,
      },
    ],
  });
  return groupId;
}
