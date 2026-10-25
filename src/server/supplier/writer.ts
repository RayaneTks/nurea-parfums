import "server-only";
import {
  SUPPLIER_FUTURE_DATE_MESSAGE,
  type RecordSupplierEntryData,
  type SettleSupplierDebtInput,
  type SupplierEntryDeletion,
  type SupplierEntrySummary,
  type UpdateSupplierEntryData,
} from "@/contracts/supplier";
import { valueDateOf } from "@/contracts/treasury";
import { DomainError } from "@/domain/errors";
import { dzd, dzdFromDb } from "@/domain/money";
import type { Tx } from "@/server/db/transaction";
import { ENTRY_SUMMARY_SELECT, entrySummary } from "@/server/supplier/dto";
import { batchCostsByIdSql, documentCostsByIdSql, type PickerBatchRow, type PickerDocumentRow } from "@/server/supplier/sql";

/**
 * Seul fichier qui écrit `SupplierEntry` et `SupplierEntryItem` (04 §4.3 ; docs/admin/dettes-fournisseur.md).
 *
 * Un carnet, pas une pièce comptable : une ligne se corrige et se supprime. Aucune écriture ici ne touche
 * l'argent de la gestion (`CashMovement`, `Pocket`) ni un document ou un lot : les éléments cochés ne font
 * que les désigner. Le « Paiement fournisseur » de la Trésorerie reste un geste séparé, à la main.
 *
 * Un versement peut rembourser une dette précise (`settlesEntryId`, « Marquer remboursée ») : il porte
 * toujours le montant de la dette, et disparaît avec elle (cascade).
 */

export const SUPPLIER_ENTRY_NOT_FOUND = "Cette ligne du carnet n'existe plus. Recharge l'écran pour voir le carnet à jour.";
const ITEM_TARGET_GONE =
  "Un élément coché n'existe plus ou a été annulé depuis un autre écran. Recharge la liste et recoche.";

const NOT_A_DEBT = "Seule une dette se marque remboursée.";
const SETTLEMENT_AMOUNT_LOCKED =
  "Ce versement rembourse une dette : son montant suit celui de la dette. Modifie la dette, ou annule le remboursement.";

const SELECT = ENTRY_SUMMARY_SELECT;

function occurredAtOf(chosen: Date | null | undefined, now: Date): Date {
  const date = valueDateOf(chosen, now);
  if (date === null) throw new DomainError("VALIDATION", SUPPLIER_FUTURE_DATE_MESSAGE, "occurredAt");
  return date;
}

/** Noter une dette ou un versement. Un identifiant déjà connu rend la ligne existante (renvoi, double tap). */
export async function recordEntry(tx: Tx, input: RecordSupplierEntryData): Promise<SupplierEntrySummary> {
  const existing = await tx.db.supplierEntry.findUnique({ where: { id: input.id }, select: SELECT });
  if (existing) return entrySummary(existing);

  const documentIds = input.items.flatMap((item) => (item.kind === "document" ? [item.documentId] : []));
  const batchIds = input.items.flatMap((item) => (item.kind === "batch" ? [item.batchId] : []));
  // Le coût de chaque élément est RECALCULÉ ici, par la requête même du sélecteur : l'écran ne l'envoie pas.
  const [documents, batches] = await Promise.all([
    documentIds.length ? tx.db.$queryRaw<PickerDocumentRow[]>(documentCostsByIdSql(documentIds)) : [],
    batchIds.length ? tx.db.$queryRaw<PickerBatchRow[]>(batchCostsByIdSql(batchIds)) : [],
  ]);
  if (documents.length !== documentIds.length || batches.length !== batchIds.length) {
    throw new DomainError("NOT_FOUND", ITEM_TARGET_GONE, "items");
  }
  const costOf = new Map<string, string>([
    ...documents.map((row) => [`d:${row.id}`, row.costDzd] as const),
    ...batches.map((row) => [`b:${row.id}`, row.costDzd] as const),
  ]);

  const created = await tx.db.supplierEntry.create({
    data: {
      id: input.id,
      kind: input.kind,
      amountDzd: input.amountDzd,
      label: input.label ?? null,
      note: input.note ?? null,
      occurredAt: occurredAtOf(input.occurredAt, tx.now),
    },
    select: SELECT,
  });
  if (input.items.length > 0) {
    await tx.db.supplierEntryItem.createMany({
      data: input.items.map((item) => ({
        entryId: created.id,
        ...(item.kind === "document"
          ? { documentId: item.documentId, amountDzd: costOf.get(`d:${item.documentId}`) ?? "0" }
          : { batchId: item.batchId, amountDzd: costOf.get(`b:${item.batchId}`) ?? "0" }),
      })),
    });
  }
  return entrySummary(created);
}

/**
 * « Marquer remboursée » : un versement du montant de la dette, daté maintenant, rattaché à elle. Une dette
 * déjà remboursée rend son versement existant (deux écrans, double tap) : jamais deux remboursements.
 */
export async function settleDebt(tx: Tx, input: SettleSupplierDebtInput): Promise<SupplierEntrySummary> {
  const existing = await tx.db.supplierEntry.findUnique({ where: { id: input.id }, select: SELECT });
  if (existing) return entrySummary(existing);

  const debt = await tx.db.supplierEntry.findUnique({ where: { id: input.debtId }, select: SELECT });
  if (!debt) throw new DomainError("NOT_FOUND", SUPPLIER_ENTRY_NOT_FOUND);
  if (debt.kind !== "DEBT") throw new DomainError("VALIDATION", NOT_A_DEBT);
  if (debt.settledBy) {
    const payment = await tx.db.supplierEntry.findUniqueOrThrow({ where: { id: debt.settledBy.id }, select: SELECT });
    return entrySummary(payment);
  }
  return entrySummary(
    await tx.db.supplierEntry.create({
      data: { id: input.id, kind: "PAYMENT", amountDzd: debt.amountDzd, settlesEntryId: debt.id, occurredAt: tx.now },
      select: SELECT,
    }),
  );
}

/**
 * Corriger montant, nom, note ou date ; un appel sans changement rend la ligne telle quelle. Le montant
 * d'une dette remboursée entraîne celui de son remboursement ; celui du remboursement ne se touche pas seul.
 */
export async function updateEntry(tx: Tx, input: UpdateSupplierEntryData): Promise<SupplierEntrySummary> {
  const current = await tx.db.supplierEntry.findUnique({ where: { id: input.id }, select: SELECT });
  if (!current) throw new DomainError("NOT_FOUND", SUPPLIER_ENTRY_NOT_FOUND);
  const amountChanges = input.amountDzd !== undefined && dzd.compare(dzdFromDb(current.amountDzd), dzdFromDb(input.amountDzd)) !== 0;
  if (amountChanges && current.settlesEntryId) {
    throw new DomainError("VALIDATION", SETTLEMENT_AMOUNT_LOCKED, "amountDzd");
  }
  if (amountChanges && current.settledBy) {
    await tx.db.supplierEntry.update({ where: { id: current.settledBy.id }, data: { amountDzd: input.amountDzd } });
  }
  const data = {
    ...(input.amountDzd !== undefined ? { amountDzd: input.amountDzd } : {}),
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    ...(input.occurredAt !== undefined ? { occurredAt: occurredAtOf(input.occurredAt, tx.now) } : {}),
  };
  if (Object.keys(data).length === 0) return entrySummary(current);
  return entrySummary(await tx.db.supplierEntry.update({ where: { id: input.id }, data, select: SELECT }));
}

/** Supprimer une ligne et ses éléments cochés (cascade). Une ligne déjà absente est un succès (renvoi). */
export async function deleteEntry(tx: Tx, id: string): Promise<SupplierEntryDeletion> {
  const { count } = await tx.db.supplierEntry.deleteMany({ where: { id } });
  return { id, deleted: count > 0 };
}
