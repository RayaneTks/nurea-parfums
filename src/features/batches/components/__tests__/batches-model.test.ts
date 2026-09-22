import { describe, expect, it } from "vitest";
import type { BatchDocumentRowDTO, BatchExpenseRowDTO, BatchRowDTO } from "@/contracts/batches";
import type { MoneyString } from "@/domain/money";
import {
  assignCta,
  assignToast,
  batchDocumentCaption,
  batchLegend,
  batchStatusLine,
  closeConfirmation,
  expenseCaption,
  expenseCta,
  expenseDeletionConfirmation,
  hasDue,
  itemsLabel,
  rowName,
  truncationNotice,
  unbatchedCaption,
} from "../batches-model";

/**
 * Libellés des écrans des lots (06 E05, E06, S12, S13). Purs : aucune base, aucun rendu — c'est ce qui
 * permet de figer les phrases que le gérant lit, y compris les singuliers et les pluriels.
 */

// Le 17 septembre 2026 à midi, heure de Paris : le « maintenant » de tous ces cas.
const NOW = new Date("2026-09-17T10:00:00.000Z");

const money = (text: string) => text as unknown as MoneyString;

function doc(overrides: Partial<BatchDocumentRowDTO> = {}): BatchDocumentRowDTO {
  return {
    id: "doc-1",
    origin: "ORDER",
    status: "CONFIRMED",
    customerName: "Fares Benali",
    orderedAt: "2026-09-12T10:00:00.000Z",
    deliveredAt: null,
    cancelledAt: null,
    total: money("120.00"),
    due: money("0.00"),
    items: ["Sauvage", "Libre"],
    lineCount: 4,
    ...overrides,
  };
}

function batch(overrides: Partial<BatchRowDTO> = {}): BatchRowDTO {
  return {
    id: "lot-1",
    name: "Commande de mars",
    status: "OPEN",
    expectedAt: null,
    createdAt: "2026-09-02T10:00:00.000Z",
    documentCount: 12,
    figures: {
      batchId: "lot-1",
      encaisse: money("1000.00"),
      aEncaisser: money("0.00"),
      margeNette: {
        value: money("380.00"),
        percent: "38",
        encaisse: money("1000.00"),
        costs: money("575.00"),
        expenses: money("45.00"),
        hasUnknownCost: false,
        unknownCostCount: 0,
      },
    },
    ...overrides,
  };
}

const expense = (overrides: Partial<BatchExpenseRowDTO> = {}): BatchExpenseRowDTO => ({
  id: "dep-1",
  label: "Transport",
  notes: null,
  amount: money("45.00"),
  occurredAt: "2026-09-12T10:00:00.000Z",
  pocketId: "po-1",
  pocketName: "Banque",
  ...overrides,
});

describe("lignes de document", () => {
  it("nomme le client, et « Client de passage » quand personne n'est nommé", () => {
    expect(rowName(doc())).toBe("Fares Benali");
    expect(rowName(doc({ customerName: null }))).toBe("Client de passage");
    expect(rowName(doc({ customerName: "   " }))).toBe("Client de passage");
  });

  it("« Sauvage, Libre +2 » ; rien du tout sans aucune ligne", () => {
    expect(itemsLabel(doc())).toBe("Sauvage, Libre +2");
    expect(itemsLabel(doc({ items: ["Sauvage"], lineCount: 1 }))).toBe("Sauvage");
    expect(itemsLabel(doc({ items: [], lineCount: 0 }))).toBeNull();
  });

  it("dit le statut seulement s'il apprend quelque chose (05 §5.3)", () => {
    // Confirmée : le cas ordinaire, il ne se dit pas.
    expect(unbatchedCaption(doc(), NOW)).toBe("Commande du 12 sept. · Sauvage, Libre +2");
    expect(unbatchedCaption(doc({ status: "PENDING" }), NOW)).toBe("Commande du 12 sept. · Sauvage, Libre +2 · En attente");
    expect(unbatchedCaption(doc({ status: "DELIVERED" }), NOW)).toBe("Commande du 12 sept. · Sauvage, Libre +2 · Livrée");
    // Une vente directe livrée est le cas normal d'une vente : « Livrée » n'y apprend rien.
    expect(unbatchedCaption(doc({ origin: "DIRECT_SALE", status: "DELIVERED" }), NOW)).toBe(
      "Vente du 12 sept. · Sauvage, Libre +2",
    );
  });

  it("sur la fiche du lot, la légende date la livraison et l'annulation", () => {
    expect(batchDocumentCaption(doc({ status: "PENDING" }), NOW)).toBe("Commande du 12 sept. · En attente");
    expect(batchDocumentCaption(doc({ status: "DELIVERED", deliveredAt: "2026-09-15T10:00:00.000Z" }), NOW)).toBe(
      "Commande du 12 sept. · livrée 15 sept.",
    );
    expect(batchDocumentCaption(doc({ status: "CANCELLED", cancelledAt: "2026-09-16T10:00:00.000Z" }), NOW)).toBe(
      "Commande du 12 sept. · annulée 16 sept.",
    );
    expect(batchDocumentCaption(doc(), NOW)).toBe("Commande du 12 sept.");
  });

  it("un dû se reconnaît au montant, pas au statut", () => {
    expect(hasDue(doc())).toBe(false);
    expect(hasDue(doc({ due: money("60.00") }))).toBe(true);
  });
});

describe("lignes de lot", () => {
  it("l'arrivée prévue quand il y en a une, le mois de création sinon", () => {
    expect(batchLegend(batch({ expectedAt: "2026-10-03T10:00:00.000Z" }), NOW)).toBe("arrivée prévue 3 oct. · 12 documents");
    expect(batchLegend(batch(), NOW)).toBe("créé en septembre · 12 documents");
  });

  it("le mois de création est daté dès qu'il n'est pas de cette année", () => {
    expect(batchLegend(batch({ createdAt: "2025-09-02T10:00:00.000Z" }), NOW)).toBe("créé en septembre 2025 · 12 documents");
  });

  it("un lot sans document ne compte pas de documents", () => {
    expect(batchLegend(batch({ documentCount: 0 }), NOW)).toBe("créé en septembre");
    expect(batchLegend(batch({ documentCount: 1 }), NOW)).toBe("créé en septembre · 1 document");
  });

  it("l'en-tête de la fiche dit l'état puis la date", () => {
    expect(batchStatusLine({ status: "OPEN", expectedAt: "2026-10-03T10:00:00.000Z" }, "2026-09-02T10:00:00.000Z", NOW)).toBe(
      "Ouvert · arrivée prévue 3 oct.",
    );
    expect(batchStatusLine({ status: "CLOSED", expectedAt: null }, "2026-09-02T10:00:00.000Z", NOW)).toBe(
      "Clos · créé en septembre",
    );
  });
});

describe("dépenses", () => {
  it("« 12 sept. · Banque », et la note quand il y en a une", () => {
    expect(expenseCaption(expense(), NOW)).toBe("12 sept. · Banque");
    expect(expenseCaption(expense({ notes: "Vol AH1006" }), NOW)).toBe("12 sept. · Banque · Vol AH1006");
    expect(expenseCaption(expense({ notes: "   " }), NOW)).toBe("12 sept. · Banque");
  });

  it("la confirmation de suppression dit où l'argent revient, et à quelle date", () => {
    const { title, description } = expenseDeletionConfirmation(expense(), NOW);
    expect(title).toBe("Supprimer « Transport » ?");
    expect(description).toContain("reviennent dans Banque");
    expect(description).toContain("le 12 sept.");
    // Le montant passe par le module monétaire : espace fine insécable et virgule décimale.
    expect(description.startsWith("45,00")).toBe(true);
  });

  it("le CTA nomme ce qu'il va écrire, et guide quand le montant manque", () => {
    expect(expenseCta("45,00 €", "Banque")).toBe("Ajouter 45,00 € · Banque");
    expect(expenseCta("45,00 €", null)).toBe("Ajouter 45,00 €");
    expect(expenseCta(null, "Banque")).toBe("Saisir le montant");
  });
});

describe("clôture", () => {
  it("dit ce qu'elle interdit, ce qu'elle laisse passer, et qu'elle se défait", () => {
    const { title, description } = closeConfirmation("Commande de mars");
    expect(title).toBe("Clôturer « Commande de mars » ?");
    expect(description).toContain("Plus aucune vente ni commande ne pourra y être rattachée.");
    expect(description).toContain("Les dépenses tardives restent possibles.");
    expect(description).toContain("Tu pourras le rouvrir.");
  });
});

describe("S13 — rattachement en masse", () => {
  it("le CTA compte les changements", () => {
    expect(assignCta(0)).toBe("Aucun changement");
    expect(assignCta(1)).toBe("Enregistrer (1 changement)");
    expect(assignCta(3)).toBe("Enregistrer (3 changements)");
  });

  it("le toast dit ce qui a été appliqué, jamais « mis à jour » quand rien ne l'a été", () => {
    expect(assignToast({ attached: 3, detached: 0, applied: 3 })).toBe("3 documents rattachés");
    expect(assignToast({ attached: 0, detached: 1, applied: 1 })).toBe("1 retiré du lot");
    expect(assignToast({ attached: 2, detached: 1, applied: 3 })).toBe("2 documents rattachés · 1 retiré du lot");
    expect(assignToast({ attached: 3, detached: 0, applied: 0 })).toBe("Aucun changement : tout était déjà à jour.");
    expect(assignToast({ attached: 3, detached: 0, applied: 2 })).toBe("2 documents enregistrés · 1 déjà à jour");
  });
});

describe("troncature", () => {
  it("une liste tronquée le dit ; une liste complète n'a rien à avouer", () => {
    expect(truncationNotice(100, 132)).toBe("100 affichés sur 132");
    expect(truncationNotice(4, 4)).toBeNull();
    expect(truncationNotice(0, 0)).toBeNull();
  });
});
