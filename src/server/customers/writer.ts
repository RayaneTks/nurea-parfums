import "server-only";
import {
  customerDeletionBlock,
  type CreateCustomerData,
  type CustomerFieldsData,
  type CustomerSummary,
  type UpdateCustomerData,
} from "@/contracts/customers";
import { DomainError } from "@/domain/errors";
import type { Tx } from "@/server/db/transaction";

/**
 * Seul fichier qui écrit `Customer` (03 §4.2, 04 §4.3) : création (dont en ligne depuis un document),
 * modification, suppression. Le writer cherche la fiche en conflit avant d'écrire, pour nommer le
 * client dans le message (04 §9.3) plutôt que de laisser la base refuser sans contexte.
 */

const SUMMARY_SELECT = {
  id: true,
  fullName: true,
  phoneE164: true,
  whatsappE164: true,
  snapchat: true,
  address: true,
  notes: true,
} as const;

export const CUSTOMER_NOT_FOUND = "Cette fiche client n'existe plus. Elle a peut-être été supprimée depuis un autre écran.";

/** Refus du numéro déjà porté par une autre fiche : « Ce numéro est déjà celui de Lina. » (06 E20, S10). */
async function assertPhoneFree(tx: Tx, phoneE164: string | null | undefined, selfId?: string): Promise<void> {
  if (!phoneE164) return;
  const owner = await tx.db.customer.findUnique({ where: { phoneE164 }, select: { id: true, fullName: true } });
  if (owner && owner.id !== selfId) {
    throw new DomainError("CONFLICT", `Ce numéro est déjà celui de ${owner.fullName}.`);
  }
}

/** Création (E20, S10, création en ligne de T1/T2). Un id déjà connu rend la fiche existante (04 §3.6). */
export async function createCustomer(
  tx: Tx,
  input: CustomerFieldsData & Pick<CreateCustomerData, "id">,
): Promise<CustomerSummary> {
  if (input.id) {
    const existing = await tx.db.customer.findUnique({ where: { id: input.id }, select: SUMMARY_SELECT });
    if (existing) return existing;
  }
  await assertPhoneFree(tx, input.phone);
  return tx.db.customer.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      fullName: input.fullName,
      phoneE164: input.phone ?? null,
      whatsappE164: input.whatsapp ?? null,
      snapchat: input.snapchat ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    },
    select: SUMMARY_SELECT,
  });
}

/** Modification : un champ absent n'est pas touché, un champ vidé est effacé. */
export async function updateCustomer(tx: Tx, input: UpdateCustomerData): Promise<CustomerSummary> {
  const current = await tx.db.customer.findUnique({ where: { id: input.id }, select: SUMMARY_SELECT });
  if (!current) throw new DomainError("NOT_FOUND", CUSTOMER_NOT_FOUND);
  if (input.phone !== undefined && input.phone !== current.phoneE164) await assertPhoneFree(tx, input.phone, input.id);

  const data = {
    ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
    ...(input.phone !== undefined ? { phoneE164: input.phone } : {}),
    ...(input.whatsapp !== undefined ? { whatsappE164: input.whatsapp } : {}),
    ...(input.snapchat !== undefined ? { snapchat: input.snapchat } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
  if (Object.keys(data).length === 0) return current;
  return tx.db.customer.update({ where: { id: input.id }, data, select: SUMMARY_SELECT });
}

/** Fiche à lier à un document (T1, T2) : le nom devient le snapshot du document. */
export async function findCustomerForLink(tx: Tx, id: string): Promise<{ id: string; fullName: string }> {
  const customer = await tx.db.customer.findUnique({ where: { id }, select: { id: true, fullName: true } });
  if (!customer) throw new DomainError("NOT_FOUND", CUSTOMER_NOT_FOUND);
  return customer;
}

/**
 * Verrou de la fiche avant suppression : un document en cours de création qui la référence attend
 * (sa clé étrangère prend un verrou partagé sur la ligne), le décompte qui suit le voit donc.
 */
export async function lockCustomer(tx: Tx, id: string): Promise<{ id: string; fullName: string } | null> {
  const rows = await tx.db.$queryRaw<{ id: string; fullName: string }[]>`
    SELECT id, "fullName" FROM "Customer" WHERE id = ${id} FOR UPDATE`;
  return rows[0] ?? null;
}

/**
 * Règle unique de suppression (03 §4.4, 02 §4.10) : refus tant qu'une commande en attente ou confirmée
 * est liée, avec le nombre et le geste qui débloque (06 E14). Une vente directe n'est jamais en cours.
 */
export async function assertCustomerDeletable(tx: Tx, id: string): Promise<void> {
  const open = await tx.db.saleDocument.count({ where: { customerId: id, status: { in: ["PENDING", "CONFIRMED"] } } });
  const reason = customerDeletionBlock(open);
  if (reason !== null) throw new DomainError("CONFLICT", reason);
}

/** Suppression : les documents liés passent en `SetNull` et gardent leur snapshot de nom. */
export async function deleteCustomer(tx: Tx, id: string): Promise<void> {
  await tx.db.customer.delete({ where: { id }, select: { id: true } });
}
