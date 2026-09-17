"use server";
import "server-only";
import { createCustomerInput, deleteCustomerInput, updateCustomerInput } from "@/contracts/customers";
import * as customersWriter from "@/server/customers/writer";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as documentsWriter from "@/server/documents/writer";

/** Créer une fiche (E20) ou en ligne depuis un sélecteur (S10). */
export const createCustomerAction = defineAction("customers.create", createCustomerInput, (input) =>
  inTransaction((tx) => customersWriter.createCustomer(tx, input)),
);

/** Modifier une fiche (E20, nom en place sur E14). */
export const updateCustomerAction = defineAction("customers.update", updateCustomerInput, (input) =>
  inTransaction((tx) => customersWriter.updateCustomer(tx, input)),
);

/**
 * Supprimer une fiche (E14, undo 5 s côté shell). Refus si une commande est en cours ; sinon les
 * documents liés sont détachés et restent affichés sous le DERNIER nom de la fiche (06 E14 : « Ses
 * documents sont conservés et restent affichés sous son nom »). Une fiche déjà absente est un succès :
 * un renvoi après coupure ne doit pas afficher d'erreur.
 */
export const deleteCustomerAction = defineAction("customers.delete", deleteCustomerInput, (input) =>
  inTransaction(async (tx) => {
    const customer = await customersWriter.lockCustomer(tx, input.id);
    if (!customer) return { id: input.id, deleted: false };
    await customersWriter.assertCustomerDeletable(tx, customer.id);
    await documentsWriter.freezeCustomerName(tx, customer.id, customer.fullName);
    await customersWriter.deleteCustomer(tx, customer.id);
    return { id: input.id, deleted: true };
  }),
);
