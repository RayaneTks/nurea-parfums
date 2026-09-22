/**
 * Jeu de données « ancien schéma » de tests/db/reprise.test.ts (docs/refonte/07-PLAN-EXECUTION.md J2,
 * « Contenu »). Chaque bloc construit UN cas ; les valeurs attendues, calculées à la main à partir des
 * règles de 03 §7.5–7.7, sont dans `attendu.ts`.
 *
 * Dates : colonnes `timestamp` sans fuseau, écrites en UTC comme Prisma le faisait.
 *
 * Contenances : la base source est celle de la production APRÈS `20260910120000_real_volumes_10_50_80`
 * (30 → 10, 100 → 80). Les lignes portent donc 10 / 50 / 80 ml, sauf les cas volontairement hors règle :
 * 75 ml, volume nul, et une contenance héritée 30 ml restée non traduite (cas 25).
 */
import { insert, type Row, type SqlRunner } from "../../support/database";

const T = (date: string) => date; // lisibilité : toutes les dates sont UTC

type Ligne = [table: string, row: Row];

const SAUVAGE = { name: "Sauvage", brandName: "Dior", image: "https://cdn.test/sauvage.webp" };
const KHAMRAH = { name: "Khamrah", brandName: "Lattafa", image: "https://cdn.test/khamrah.webp" };

function mouvement(
  id: string,
  pocketId: string,
  amount: string,
  kind: string,
  occurredAt: string,
  extra: Row = {},
): Ligne {
  return ["CashMovement", { id, pocketId, amount, kind, occurredAt, createdAt: occurredAt, ...extra }];
}

function commande(id: string, status: string, orderedAt: string, extra: Row = {}): Ligne {
  return ["Order", { id, status, orderedAt, createdAt: orderedAt, updatedAt: orderedAt, ...extra }];
}

function ligneCommande(id: string, orderId: string, perfumeId: number | null, volumeMl: number, quantity: number, unitPrice: string, unitCost: string, extra: Row = {}): Ligne {
  return ["OrderItem", { id, orderId, perfumeId, volumeMl, quantity, unitPrice, unitCost, ...extra }];
}

function paiement(id: string, orderId: string, type: string, amount: string, paidAt: string, extra: Row = {}): Ligne {
  return ["PaymentTransaction", { id, orderId, type, amount, paidAt, createdAt: paidAt, ...extra }];
}

function vente(id: string, soldAt: string, totalRevenue: string, totalCost: string, remainingDue: string, extra: Row = {}): Ligne {
  const marge = (Number(totalRevenue) * 100 - Number(totalCost) * 100) / 100;
  return [
    "Sale",
    { id, soldAt, totalRevenue, totalCost, totalMargin: marge.toFixed(2), remainingDue, createdAt: soldAt, updatedAt: soldAt, ...extra },
  ];
}

function ligneVente(
  id: string,
  saleId: string,
  perfumeId: number | null,
  snapshot: object,
  volumeMl: number | null,
  quantity: number,
  unitPrice: string,
  unitCost: string,
  extra: Row = {},
): Ligne {
  const revenu = (Number(unitPrice) * quantity).toFixed(2);
  const cout = (Number(unitCost) * quantity).toFixed(2);
  return [
    "SaleItem",
    {
      id,
      saleId,
      perfumeId,
      perfumeSnapshot: JSON.stringify(snapshot),
      volumeMl,
      quantity,
      unitPrice,
      unitCost,
      lineRevenue: revenu,
      lineCost: cout,
      lineMargin: (Number(revenu) - Number(cout)).toFixed(2),
      ...extra,
    },
  ];
}

export const JEU: Ligne[] = [
  // ─── Référentiels ────────────────────────────────────────────────────────────────────────────────
  ["AdminUser", { id: "admin-1", username: "gerant", passwordHash: "x", role: "OWNER", createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-01 08:00:00") }],
  ["AuditLog", { id: "audit-1", actorId: "admin-1", action: "order.create", entity: "Order", entityId: "cmd-doublon", meta: '{"montant": 70.00}', createdAt: T("2026-08-10 09:00:00") }],
  ["AppSetting", { key: "exchangeRateDzdEur", value: "275,5", updatedAt: T("2026-01-01 08:00:00") }],
  ["Customer", { id: "cli-amina", fullName: "Amina Benali", phoneE164: "+33600000001", createdAt: T("2026-01-02 10:00:00"), updatedAt: T("2026-01-02 10:00:00") }],
  ["Customer", { id: "cli-karim", fullName: "Karim Haddad", phoneE164: "+33600000002", createdAt: T("2026-01-02 10:00:00"), updatedAt: T("2026-01-02 10:00:00") }],
  ["Customer", { id: "cli-sofia", fullName: "Sofia Martin", createdAt: T("2026-01-02 10:00:00"), updatedAt: T("2026-01-02 10:00:00") }],
  ["Batch", { id: "lot-mars", name: "Lot de mars", status: "OPEN", createdAt: T("2026-03-01 08:00:00"), updatedAt: T("2026-03-01 08:00:00") }],
  ["Batch", { id: "lot-avril", name: "Lot d'avril", status: "CLOSED", createdAt: T("2026-04-01 08:00:00"), updatedAt: T("2026-04-01 08:00:00") }],
  ["Brand", { id: "marque-dior", name: "Dior", slug: "dior", catalogMode: "CURATED", status: "PUBLISHED", image: "https://cdn.test/dior.webp", createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-01 08:00:00") }],
  ["Brand", { id: "marque-lattafa", name: "Lattafa", slug: "lattafa", catalogMode: "COMPLETE", status: "PUBLISHED", image: "https://cdn.test/lattafa.webp", createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-01 08:00:00") }],
  ["Brand", { id: "marque-brouillon", name: "Marque brouillon", slug: "marque-brouillon", catalogMode: "CURATED", status: "DRAFT", createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-01 08:00:00") }],
  // Stocks 5 / 0 / −2 (03 §7.7) ; le troisième visuel est un placeholder, exclu de la vitrine.
  ["Perfume", { id: 1, brandId: "marque-dior", name: "Sauvage", slug: "sauvage", image: "https://cdn.test/sauvage.webp", status: "PUBLISHED", stock: 5, createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-01 08:00:00") }],
  ["Perfume", { id: 2, brandId: "marque-lattafa", name: "Khamrah", slug: "khamrah", image: "https://cdn.test/khamrah.webp", status: "PUBLISHED", stock: 0, createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-01 08:00:00") }],
  ["Perfume", { id: 3, brandId: "marque-dior", name: "Fahrenheit", slug: "fahrenheit", image: "https://cdn.test/placeholder.svg", status: "PUBLISHED", stock: -2, createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-01 08:00:00") }],
  ["PerfumePricing", { perfumeId: 1, volumeMl: 80, defaultUnitPriceEur: "60.00", defaultUnitCostDzd: "5540.00", defaultExchangeRate: "277.0000", updatedAt: T("2026-03-05 14:00:00") }],
  // Visuel story (20260910140000_perfume_media) : conservé tel quel, jamais touché par la reprise (V5, V11).
  ["PerfumeMedia", { id: "media-sauvage-1", perfumeId: 1, path: "stories/1/1757495346763-ab12cd34.webp", url: "https://cdn.test/storage/v1/object/public/catalog/stories/1/1757495346763-ab12cd34.webp", label: "Story 9:16", width: 941, height: 1672, bytes: 182340, sortOrder: 0, createdAt: T("2026-09-10 09:09:06.763") }],

  // ─── Poches : deux « Non attribué » (création concurrente), une archivée à solde nul ────────────
  ["Pocket", { id: "poche-especes", name: "Espèces", kind: "CASH", openingBalance: "100.00", sortOrder: 1, createdAt: T("2026-01-01 09:00:00"), updatedAt: T("2026-01-01 09:00:00") }],
  ["Pocket", { id: "poche-banque", name: "Banque", kind: "BANK", openingBalance: "0.00", sortOrder: 2, createdAt: T("2026-01-01 09:05:00"), updatedAt: T("2026-01-01 09:05:00") }],
  ["Pocket", { id: "poche-na-1", name: "Non attribué", kind: "UNASSIGNED", isSystem: true, sortOrder: 999, createdAt: T("2026-02-01 10:00:00.000"), updatedAt: T("2026-02-01 10:00:00") }],
  ["Pocket", { id: "poche-na-2", name: "Non attribué", kind: "UNASSIGNED", isSystem: true, openingBalance: "5.00", sortOrder: 999, createdAt: T("2026-02-01 10:00:00.500"), updatedAt: T("2026-02-01 10:00:00") }],
  ["Pocket", { id: "poche-archivee", name: "Ancienne caisse", kind: "CASH", archived: true, openingBalance: "20.00", sortOrder: 3, createdAt: T("2026-01-01 08:00:00"), updatedAt: T("2026-01-20 08:00:00") }],

  // ─── Mouvements manuels : transfert complet, transfert incomplet, ajustement, fournisseur, répartition
  mouvement("mv-transfert-arc-out", "poche-archivee", "-20.00", "TRANSFER", T("2026-01-15 09:00:00"), { transferGroupId: "grp-complet", label: "Transfert" }),
  mouvement("mv-transfert-arc-in", "poche-especes", "20.00", "TRANSFER", T("2026-01-15 09:00:00"), { transferGroupId: "grp-complet", label: "Transfert" }),
  mouvement("mv-transfert-seul", "poche-especes", "-15.00", "TRANSFER", T("2026-03-01 18:00:00"), { transferGroupId: "grp-incomplet", label: "Transfert" }),
  mouvement("mv-fournisseur", "poche-banque", "-100.00", "SUPPLIER_OUT", T("2026-03-02 09:00:00"), { refType: "Batch", refId: "lot-mars", label: "Avance fournisseur" }),
  mouvement("mv-ajustement", "poche-especes", "-3.50", "ADJUSTMENT", T("2026-04-30 19:00:00"), { label: "Erreur de caisse" }),
  mouvement("mv-repartition-out", "poche-na-2", "-10.00", "TRANSFER", T("2026-05-01 12:00:00"), { transferGroupId: "grp-repartition", label: "Répartition" }),
  mouvement("mv-repartition-in", "poche-banque", "10.00", "TRANSFER", T("2026-05-01 12:00:00"), { transferGroupId: "grp-repartition", label: "Répartition" }),

  // ─── Mouvements orphelins : vente supprimée, dépense d'un lot supprimé ─────────────────────────────
  mouvement("mv-orphelin-vente", "poche-banque", "33.00", "SALE_IN", T("2026-02-15 10:00:00"), { refType: "Sale", refId: "vente-supprimee", label: "Vente" }),
  mouvement("mv-orphelin-depense", "poche-especes", "-12.00", "EXPENSE_OUT", T("2026-02-20 10:00:00"), { refType: "BatchExpense", refId: "depense-lot-supprime", label: "Dépense" }),

  // ─── Cas 1 : vente directe payée, ventilée sur deux poches ─────────────────────────────────────────
  vente("vente-directe-payee", T("2026-03-05 14:00:00"), "120.00", "40.00", "0.00", { customerId: "cli-amina", customerName: "Amina Benali", batchId: "lot-mars" }),
  ligneVente("vl-directe-1", "vente-directe-payee", 1, SAUVAGE, 80, 2, "60.00", "20.00", { unitCostDzd: "5540.00", exchangeRate: "277.00" }),
  mouvement("mv-directe-esp", "poche-especes", "70.00", "SALE_IN", T("2026-03-05 14:00:00"), { refType: "Sale", refId: "vente-directe-payee", createdAt: T("2026-03-05 14:00:01") }),
  mouvement("mv-directe-bq", "poche-banque", "50.00", "SALE_IN", T("2026-03-05 14:00:00"), { refType: "Sale", refId: "vente-directe-payee", createdAt: T("2026-03-05 14:00:02") }),

  // ─── Cas 2 : vente à reste dû ──────────────────────────────────────────────────────────────────────
  vente("vente-reste-du", T("2026-04-10 11:00:00"), "45.00", "12.00", "25.00", { customerId: "cli-karim", customerName: "Karim Haddad" }),
  ligneVente("vl-reste-1", "vente-reste-du", 2, KHAMRAH, 50, 1, "45.00", "12.00"),
  mouvement("mv-reste-na", "poche-na-1", "20.00", "SALE_IN", T("2026-04-10 11:00:00"), { refType: "Sale", refId: "vente-reste-du" }),

  // ─── Cas 3 : vente dont la commande a été purgée (acompte orphelin + SALE_IN du total) ─────────────
  vente("vente-cmd-purgee", T("2026-03-20 16:00:00"), "80.00", "25.00", "0.00", { customerId: "cli-sofia", customerName: "Sofia Martin" }),
  ligneVente("vl-purgee-1", "vente-cmd-purgee", 1, SAUVAGE, 80, 1, "80.00", "25.00"),
  mouvement("mv-purgee-acompte", "poche-especes", "30.00", "DEPOSIT_IN", T("2026-03-10 10:00:00"), { refType: "PaymentTransaction", refId: "pt-purgee-disparu", label: "Acompte" }),
  mouvement("mv-purgee-vente", "poche-especes", "80.00", "SALE_IN", T("2026-03-20 16:00:00"), { refType: "Sale", refId: "vente-cmd-purgee" }),

  // ─── Cas 4 : paire commande + vente avec acompte (double comptage), coût perdu au pont ────────────
  commande("cmd-paire-livree", "DELIVERED", T("2026-04-01 09:00:00"), { customerId: "cli-karim", customerName: "Karim Haddad", batchId: "lot-avril", deliveryAt: T("2026-04-15 00:00:00"), deliveredAt: T("2026-04-15 18:00:00"), updatedAt: T("2026-04-15 18:00:00"), notes: "Livrer après 18 h", depositPaid: true, depositAmount: "40.00" }),
  ligneCommande("ol-paire-livree-1", "cmd-paire-livree", 1, 80, 1, "90.00", "30.00", { unitCostDzd: "8310.00", exchangeRate: "277.00", deliveredQuantity: 1 }),
  paiement("pt-paire-livree-acompte", "cmd-paire-livree", "DEPOSIT", "40.00", T("2026-04-02 12:00:00"), { method: "espèces" }),
  mouvement("mv-paire-livree-acompte", "poche-especes", "40.00", "DEPOSIT_IN", T("2026-04-02 12:00:00"), { refType: "PaymentTransaction", refId: "pt-paire-livree-acompte", label: "Acompte" }),
  vente("vente-paire-livree", T("2026-04-15 18:00:00"), "90.00", "0.00", "0.00", { orderId: "cmd-paire-livree", customerName: "Karim Haddad", notes: "Livrer après 18 h" }),
  ligneVente("vl-paire-livree-1", "vente-paire-livree", 1, SAUVAGE, 80, 1, "90.00", "0.00"),
  mouvement("mv-paire-livree-vente", "poche-especes", "90.00", "SALE_IN", T("2026-04-15 18:00:00"), { refType: "Sale", refId: "vente-paire-livree", label: "Vente" }),

  // ─── Cas 5 : paire dont la commande est restée PENDING, sans paiement ─────────────────────────────
  commande("cmd-paire-attente", "PENDING", T("2026-05-02 10:00:00"), { customerId: "cli-sofia", customerName: "Sofia Martin" }),
  ligneCommande("ol-paire-attente-1", "cmd-paire-attente", 2, 50, 1, "50.00", "15.00"),
  vente("vente-paire-attente", T("2026-05-06 15:30:00"), "50.00", "15.00", "0.00", { orderId: "cmd-paire-attente", customerId: "cli-sofia", customerName: "Sofia Martin" }),
  ligneVente("vl-paire-attente-1", "vente-paire-attente", 2, KHAMRAH, 50, 1, "50.00", "15.00"),
  mouvement("mv-paire-attente-vente", "poche-banque", "50.00", "SALE_IN", T("2026-05-06 15:30:00"), { refType: "Sale", refId: "vente-paire-attente" }),

  // ─── Cas 6 : paire dont la commande est CANCELLED avec acompte antérieur à la vente ─────────────────
  commande("cmd-paire-annulee", "CANCELLED", T("2026-05-10 09:00:00"), { customerName: "Nadia", customerContact: "@nadia.snap", updatedAt: T("2026-05-20 12:00:00"), depositPaid: true, depositAmount: "15.00" }),
  ligneCommande("ol-paire-annulee-1", "cmd-paire-annulee", 1, 10, 1, "35.00", "10.00"),
  paiement("pt-paire-annulee-acompte", "cmd-paire-annulee", "DEPOSIT", "15.00", T("2026-05-12 10:00:00")),
  mouvement("mv-paire-annulee-acompte", "poche-banque", "15.00", "DEPOSIT_IN", T("2026-05-12 10:00:00"), { refType: "PaymentTransaction", refId: "pt-paire-annulee-acompte" }),
  vente("vente-paire-annulee", T("2026-05-16 17:00:00"), "35.00", "10.00", "0.00", { orderId: "cmd-paire-annulee" }),
  ligneVente("vl-paire-annulee-1", "vente-paire-annulee", 1, SAUVAGE, 10, 1, "35.00", "10.00"),
  mouvement("mv-paire-annulee-vente", "poche-banque", "35.00", "SALE_IN", T("2026-05-16 17:00:00"), { refType: "Sale", refId: "vente-paire-annulee" }),

  // ─── Cas 7 : commande en attente avec acompte sans mouvement ──────────────────────────────────────
  commande("cmd-attente-acompte", "PENDING", T("2026-06-01 10:00:00"), { customerId: "cli-amina", customerName: "Amina Benali", deliveryAt: T("2026-06-20 00:00:00"), depositPaid: true, depositAmount: "25.00" }),
  ligneCommande("ol-attente-1", "cmd-attente-acompte", 2, 80, 2, "55.00", "18.00", { unitCostDzd: "4986.00", exchangeRate: "277.00" }),
  paiement("pt-attente-acompte", "cmd-attente-acompte", "DEPOSIT", "25.00", T("2026-06-01 10:00:00")),

  // ─── Cas 8 : commande confirmée partiellement livrée (une ligne au coût inconnu) ───────────────────
  commande("cmd-confirmee-partielle", "READY", T("2026-06-05 09:00:00"), { customerId: "cli-karim", customerName: "Karim Haddad", batchId: "lot-avril", deliveryAt: T("2026-06-25 00:00:00"), updatedAt: T("2026-06-10 09:00:00"), depositPaid: true, depositAmount: "60.00" }),
  ligneCommande("ol-partielle-1", "cmd-confirmee-partielle", 1, 80, 2, "70.00", "22.00", { deliveredQuantity: 1 }),
  ligneCommande("ol-partielle-2", "cmd-confirmee-partielle", 2, 50, 1, "40.00", "0.00", { note: "Coffret" }),
  paiement("pt-partielle-acompte", "cmd-confirmee-partielle", "DEPOSIT", "60.00", T("2026-06-06 11:00:00")),
  mouvement("mv-partielle-acompte", "poche-especes", "60.00", "DEPOSIT_IN", T("2026-06-06 11:00:00"), { refType: "PaymentTransaction", refId: "pt-partielle-acompte" }),

  // ─── Cas 9 : commande annulée avec acompte ────────────────────────────────────────────────────────
  commande("cmd-annulee-acompte", "CANCELLED", T("2026-06-12 14:00:00"), { customerName: "Yanis", updatedAt: T("2026-06-14 09:30:00"), depositPaid: true, depositAmount: "20.00" }),
  ligneCommande("ol-annulee-1", "cmd-annulee-acompte", 1, 50, 1, "48.00", "14.00"),
  paiement("pt-annulee-acompte", "cmd-annulee-acompte", "DEPOSIT", "20.00", T("2026-06-12 14:05:00")),
  mouvement("mv-annulee-acompte", "poche-banque", "20.00", "DEPOSIT_IN", T("2026-06-12 14:05:00"), { refType: "PaymentTransaction", refId: "pt-annulee-acompte" }),

  // ─── Cas 10 : paiement annulé (ancien geste : mouvement d'origine supprimé, REFUND sans mouvement) ─
  commande("cmd-paiement-annule", "READY", T("2026-07-01 10:00:00"), { customerId: "cli-sofia", customerName: "Sofia Martin", updatedAt: T("2026-07-03 10:00:00") }),
  ligneCommande("ol-annule-1", "cmd-paiement-annule", 2, 80, 1, "65.00", "20.00"),
  paiement("pt-annule-origine", "cmd-paiement-annule", "DEPOSIT", "30.00", T("2026-07-01 10:30:00")),
  paiement("pt-annule-refund", "cmd-paiement-annule", "REFUND", "30.00", T("2026-07-02 09:00:00"), { note: "Annulation paiement pt-annule-origine: erreur de saisie" }),

  // ─── Cas 11 : commande livrée sans vente, soldée après livraison, puis remboursement ordinaire ─────
  commande("cmd-rembourse", "DELIVERED", T("2026-07-05 10:00:00"), { customerId: "cli-amina", customerName: "Amina Benali", deliveryAt: T("2026-07-08 00:00:00"), deliveredAt: T("2026-07-08 17:00:00"), updatedAt: T("2026-07-09 10:00:00") }),
  ligneCommande("ol-rembourse-1", "cmd-rembourse", 1, 80, 1, "100.00", "30.00", { deliveredQuantity: 1 }),
  paiement("pt-rembourse-solde", "cmd-rembourse", "BALANCE", "100.00", T("2026-07-08 17:30:00")),
  mouvement("mv-rembourse-solde", "poche-especes", "100.00", "BALANCE_IN", T("2026-07-08 17:30:00"), { refType: "PaymentTransaction", refId: "pt-rembourse-solde" }),
  paiement("pt-rembourse-refund", "cmd-rembourse", "REFUND", "10.00", T("2026-07-09 10:00:00"), { note: "Geste commercial" }),
  mouvement("mv-rembourse-refund", "poche-especes", "-10.00", "REFUND_OUT", T("2026-07-09 10:00:00"), { refType: "PaymentTransaction", refId: "pt-rembourse-refund", label: "Remboursement" }),

  // ─── Cas 12 : vente sans client, ventilation SALE_IN excédentaire (90 € ventilés pour 75 €) ────────
  vente("vente-ventilation-excedent", T("2026-07-15 12:00:00"), "75.00", "25.00", "0.00"),
  ligneVente("vl-excedent-1", "vente-ventilation-excedent", 1, SAUVAGE, 80, 1, "75.00", "25.00"),
  mouvement("mv-excedent-esp", "poche-especes", "50.00", "SALE_IN", T("2026-07-15 12:00:00"), { refType: "Sale", refId: "vente-ventilation-excedent", createdAt: T("2026-07-15 12:00:01") }),
  mouvement("mv-excedent-bq", "poche-banque", "40.00", "SALE_IN", T("2026-07-15 12:00:00"), { refType: "Sale", refId: "vente-ventilation-excedent", label: "Vente", createdAt: T("2026-07-15 12:00:02") }),

  // ─── Cas 13 : ligne sans nom (parfum supprimé, sans snapshot), volume 75 ml ───────────────────────
  commande("cmd-ligne-sans-nom", "PENDING", T("2026-08-01 10:00:00"), { customerName: "Inès" }),
  ligneCommande("ol-sans-nom-1", "cmd-ligne-sans-nom", null, 75, 1, "40.00", "0.00"),

  // ─── Cas 14 : volume nul et don à prix non nul, vente entièrement due ─────────────────────────────
  vente("vente-don-volume-nul", T("2026-08-05 15:00:00"), "60.00", "26.00", "60.00", { customerId: "cli-karim", customerName: "Karim Haddad", batchId: "lot-mars" }),
  ligneVente("vl-don-prix", "vente-don-volume-nul", 1, SAUVAGE, 10, 1, "5.00", "9.00", { isGift: true, note: "Offert pour l'anniversaire" }),
  ligneVente("vl-volume-nul", "vente-don-volume-nul", 2, KHAMRAH, null, 1, "55.00", "17.00"),

  // ─── Cas 16 : doublon de mouvement ────────────────────────────────────────────────────────────────
  commande("cmd-doublon", "READY", T("2026-08-10 09:00:00"), { customerId: "cli-amina", customerName: "Amina Benali", depositPaid: true, depositAmount: "35.00" }),
  ligneCommande("ol-doublon-1", "cmd-doublon", 2, 80, 1, "70.00", "21.00"),
  paiement("pt-doublon-acompte", "cmd-doublon", "DEPOSIT", "35.00", T("2026-08-10 09:15:00")),
  mouvement("mv-doublon-1", "poche-especes", "35.00", "DEPOSIT_IN", T("2026-08-10 09:15:00"), { refType: "PaymentTransaction", refId: "pt-doublon-acompte", label: "Acompte", createdAt: T("2026-08-10 09:15:00.000") }),
  mouvement("mv-doublon-2", "poche-especes", "35.00", "DEPOSIT_IN", T("2026-08-10 09:15:00"), { refType: "PaymentTransaction", refId: "pt-doublon-acompte", label: "Encaissement commande (historique)", createdAt: T("2026-08-10 09:15:00.200") }),

  // ─── Cas 17 : mouvement de paiement divergent (25 € en poche pour une pièce de 30 €), cache divergent
  commande("cmd-divergent", "READY", T("2026-08-12 10:00:00"), { customerId: "cli-karim", customerName: "Karim Haddad", depositPaid: true, depositAmount: "25.00" }),
  ligneCommande("ol-divergent-1", "cmd-divergent", 1, 50, 1, "60.00", "18.00"),
  paiement("pt-divergent-acompte", "cmd-divergent", "DEPOSIT", "30.00", T("2026-08-12 10:10:00")),
  mouvement("mv-divergent", "poche-banque", "25.00", "DEPOSIT_IN", T("2026-08-12 10:10:00"), { refType: "PaymentTransaction", refId: "pt-divergent-acompte", label: "Acompte" }),

  // ─── Cas 19 et 20 : dépenses (sans mouvement, montant divergent, liée) ────────────────────────────
  ["BatchExpense", { id: "depense-sans-mouvement", batchId: "lot-mars", label: "Billet d'avion", amount: "150.00", occurredAt: T("2026-03-03 08:00:00"), createdAt: T("2026-03-03 08:00:00") }],
  ["BatchExpense", { id: "depense-divergente", batchId: "lot-avril", label: "Transporteur DHL", amount: "42.00", occurredAt: T("2026-04-20 14:00:00"), createdAt: T("2026-04-20 14:00:00") }],
  mouvement("mv-depense-divergente", "poche-especes", "-40.00", "EXPENSE_OUT", T("2026-04-20 14:00:00"), { refType: "BatchExpense", refId: "depense-divergente", label: "Transporteur DHL" }),
  ["BatchExpense", { id: "depense-liee", batchId: "lot-avril", label: "Douane", amount: "18.00", occurredAt: T("2026-04-22 10:00:00"), createdAt: T("2026-04-22 10:00:00") }],
  mouvement("mv-depense-liee", "poche-banque", "-18.00", "EXPENSE_OUT", T("2026-04-22 10:00:00"), { refType: "BatchExpense", refId: "depense-liee", label: "Douane" }),

  // ─── Cas 22 : restes dus hors bornes, et reste dû remonté après coup (R < 0) ──────────────────────
  vente("vente-reste-negatif", T("2026-08-20 11:00:00"), "50.00", "16.00", "-10.00", { customerId: "cli-sofia", customerName: "Sofia Martin" }),
  ligneVente("vl-negatif-1", "vente-reste-negatif", 2, KHAMRAH, 80, 1, "50.00", "16.00"),
  mouvement("mv-negatif-vente", "poche-especes", "50.00", "SALE_IN", T("2026-08-20 11:00:00"), { refType: "Sale", refId: "vente-reste-negatif" }),
  vente("vente-reste-excessif", T("2026-08-21 10:00:00"), "30.00", "9.00", "45.00", { customerName: "Walid" }),
  ligneVente("vl-excessif-1", "vente-reste-excessif", 1, SAUVAGE, 10, 1, "30.00", "9.00"),
  commande("cmd-paire-remontee", "DELIVERED", T("2026-08-25 09:00:00"), { customerId: "cli-amina", customerName: "Amina Benali", deliveredAt: T("2026-08-28 10:00:00"), updatedAt: T("2026-08-28 10:00:00"), depositPaid: true, depositAmount: "80.00" }),
  ligneCommande("ol-remontee-1", "cmd-paire-remontee", 1, 80, 1, "100.00", "32.00", { deliveredQuantity: 1 }),
  paiement("pt-remontee-acompte", "cmd-paire-remontee", "DEPOSIT", "80.00", T("2026-08-25 09:30:00")),
  mouvement("mv-remontee-acompte", "poche-especes", "80.00", "DEPOSIT_IN", T("2026-08-25 09:30:00"), { refType: "PaymentTransaction", refId: "pt-remontee-acompte" }),
  vente("vente-paire-remontee", T("2026-08-28 10:00:00"), "100.00", "32.00", "50.00", { orderId: "cmd-paire-remontee", customerId: "cli-amina", customerName: "Amina Benali" }),
  ligneVente("vl-remontee-1", "vente-paire-remontee", 1, SAUVAGE, 80, 1, "100.00", "32.00"),
  mouvement("mv-remontee-vente", "poche-especes", "100.00", "SALE_IN", T("2026-08-28 10:00:00"), { refType: "Sale", refId: "vente-paire-remontee", label: "Vente" }),

  // ─── Cas 23 : vente antérieure à la Trésorerie (paiement de reprise) ─────────────────────────────
  vente("vente-avant-tresorerie", T("2026-01-20 10:00:00"), "85.00", "27.00", "0.00", { customerId: "cli-karim", customerName: "Karim Haddad" }),
  ligneVente("vl-avant-1", "vente-avant-tresorerie", 1, SAUVAGE, 80, 1, "85.00", "27.00"),

  // ─── Cas 25 : commande confirmée sans paiement, ligne à une contenance héritée (30 ml non traduit) ──
  commande("cmd-confirmee-sans-paiement", "READY", T("2026-08-30 08:00:00"), { customerName: "Léa" }),
  ligneCommande("ol-sans-paiement-1", "cmd-confirmee-sans-paiement", 2, 30, 1, "25.00", "7.00"),

  // ─── Cas 26 : trop-perçu sur une commande livrée sans vente (D2) ; livrée le 02/09 alors que la
  //     livraison était PRÉVUE le 20/09, `deliveredAt` jamais écrit : la date réelle est `updatedAt`,
  //     jamais la date prévue (9e0b5d8, 20260910160000_fix_delivered_at_backfill) ────────────────────
  commande("cmd-trop-percu", "DELIVERED", T("2026-09-01 10:00:00"), { customerId: "cli-sofia", customerName: "Sofia Martin", deliveryAt: T("2026-09-20 00:00:00"), updatedAt: T("2026-09-02 12:00:00") }),
  ligneCommande("ol-trop-percu-1", "cmd-trop-percu", 1, 10, 1, "30.00", "9.00", { deliveredQuantity: 1 }),
  paiement("pt-trop-percu", "cmd-trop-percu", "BALANCE", "35.00", T("2026-09-02 11:00:00")),
  mouvement("mv-trop-percu", "poche-especes", "35.00", "BALANCE_IN", T("2026-09-02 11:00:00"), { refType: "PaymentTransaction", refId: "pt-trop-percu" }),
];

const ORDRE = ["AdminUser", "AuditLog", "AppSetting", "Customer", "Batch", "Brand", "Perfume", "PerfumePricing", "PerfumeMedia", "Pocket", "Order", "OrderItem", "PaymentTransaction", "Sale", "SaleItem", "BatchExpense", "CashMovement"];

/** Insère le jeu dans une base à l'ancien schéma (parents avant enfants). */
export async function chargerJeu(runner: SqlRunner): Promise<void> {
  for (const table of ORDRE) {
    for (const [nom, row] of JEU) {
      if (nom === table) await insert(runner, table, row);
    }
  }
}
