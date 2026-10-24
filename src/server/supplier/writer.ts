import "server-only";
import {
  SUPPLIER_FUTURE_DATE_MESSAGE,
  type RecordSupplierEntryData,
  type SupplierEntryDeletion,
  type SupplierEntrySummary,
  type UpdateSupplierEntryData,
} from "@/contracts/supplier";
import { valueDateOf } from "@/contracts/treasury";
import { DomainError } from "@/domain/errors";
import type { Tx } from "@/server/db/transaction";
import { entrySummary } from "@/server/supplier/dto";
import { batchCostsByIdSql, documentCostsByIdSql, type PickerBatchRow, type PickerDocumentRow } from "@/server/supplier/sql";

/**
 * Seul fichier qui écrit `SupplierEntry` et `SupplierEntryItem` (04 §4.3 ; docs/admin/dettes-fournisseur.md).
 *
 * Un carnet, pas une pièce comptable : une ligne se corrige et se supprime. Aucune écriture ici ne touche
 * l'argent de la gestion (`CashMovement`, `Pocket`) ni un document ou un lot : les éléments cochés ne font
 * que les désigner. Le « Paiement fournisseur » de la Trésorerie reste un geste séparé, à la main.
 */

export const SUPPLIER_ENTRY_NOT_FOUND = "Cette ligne du carnet n'existe plus. Recharge l'écran pour voir le carnet à jour.";
const ITEM_TARGET_GONE =
  "Un élément coché n'existe plus ou a été annulé depuis un autre écran. Recharge la liste et recoche.";

const SELECT = { id: true, kind: true, amountDzd: true, label: true, note: true, occurredAt: true } as const;

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

/** Corriger montant, nom, note ou date ; un appel sans changement rend la ligne telle quelle. */
export async function updateEntry(tx: Tx, input: UpdateSupplierEntryData): Promise<SupplierEntrySummary> {
  const current = await tx.db.supplierEntry.findUnique({ where: { id: input.id }, select: SELECT });
  if (!current) throw new DomainError("NOT_FOUND", SUPPLIER_ENTRY_NOT_FOUND);
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
