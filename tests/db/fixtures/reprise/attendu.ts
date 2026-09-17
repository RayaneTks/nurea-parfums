/**
 * Valeurs attendues du jeu `jeu.ts`, calculées À LA MAIN à partir des règles de
 * docs/refonte/03-MODELE-DONNEES.md §7.5–7.7 et 07-PLAN-EXECUTION.md §2.2, §2.5 — jamais recopiées d'une
 * exécution. Détail des calculs en commentaire.
 */

/**
 * Soldes de référence (ouverture + Σ mouvements historiques) :
 * - Espèces : 100 + 20 − 12 − 15 + 70 + 30 + 80 + 40 + 90 − 40 − 3,50 + 60 + 100 − 10 + 50 + 35 + 35 + 50 + 80 + 100 + 35 = 894,50
 * - Banque : 33 − 100 + 50 − 18 + 10 + 50 + 15 + 35 + 20 + 40 + 25 = 160,00
 * - Non attribué n°1 : 20,00 ; n°2 (doublon) : 5 − 10 = −5,00 → fusionnée : 15,00
 * - Ancienne caisse (archivée) : 20 − 20 = 0,00
 * Total des poches non archivées : 894,50 + 160 + 20 − 5 = 1 069,50.
 */
export const REFERENCE = {
  poches: {
    "poche-archivee": "0.00",
    "poche-banque": "160.00",
    "poche-especes": "894.50",
    "poche-na-1": "20.00",
    "poche-na-2": "-5.00",
  },
  totalNonArchivees: "1069.50",
  nonAttribue: "15.00",
  /**
   * Ancien Encaissé = Σ ventes (total − reste dû, non borné) + Σ commandes READY/DELIVERED sans vente (payé plafonné)
   * ventes : 120 + 20 + 80 + 90 + 50 + 35 + 75 + 0 + 60 − 15 + 50 + 85 = 650
   * commandes : partielle 60 + paiement annulé 0 + remboursée 90 + doublon 35 + divergent 30 + sans paiement 0
   *             + trop-perçu min(35, 30) = 30 → 245
   */
  encaisseAncien: "895.00",
  /** D0 = (60 − 50) [reste dû −10] + (−15 − 0) [reste dû 45 > total 30] = −5 */
  d0: "-5.00",
  /** D1 = payés des commandes sans vente PENDING/CANCELLED : acompte sans mouvement 25 + annulée 20 + ligne sans nom 0 */
  d1: "45.00",
  /** D2 = trop-perçu de la commande livrée : 35 − 30 */
  d2: "5.00",
  /**
   * Ancien À encaisser (borné) : ventes 25 + 60 + min(45, 30) + 50 = 165 ;
   * commandes READY/DELIVERED : 120 + 65 + 10 + 35 + 30 + 25 + 0 = 285.
   */
  aEncaisser: "450.00",
  /** Ancienne liste (reste dû non borné) : 25 + 60 + 45 + 50 + 285 = 465 */
  aEncaisserListeAncienne: "465.00",
  /** Coûts : ventes 237 + commandes confirmées 149 = 386 ; dépenses 150 + 42 + 18 = 210 ; 895 − 386 − 210 */
  margeNetteAncienne: "299.00",
  vitrine: { parfumsPublies: 2, cartesGamme: 1, marquesExplorer: 2 },
  comptages: { Order: 14, OrderItem: 15, Sale: 12, SaleItem: 13, PaymentTransaction: 13, CashMovement: 34, PerfumeMedia: 1, paires: 4, orderItemsHorsPaires: 11 },
  /** Un visuel story sur Sauvage, déposé le 10/09/2026 à 09:09:06,763 UTC : conservé tel quel (V11). */
  visuels: { nombre: 1, createdAt: "2026-09-10T09:09:06.763Z" },
};

/**
 * Après reprise. Créations en « Non attribué » (poche-na-1) : +25 (acompte sans mouvement) +30 −30 (paiement
 * annulé et sa contre-passation) +30 (paiement conforme au lieu du mouvement divergent de 25) −150 (dépense sans
 * mouvement) −42 (dépense conforme au lieu du mouvement divergent de 40) −30 (écart à arbitrer) +85 (vente
 * antérieure à la Trésorerie) = −82 ⇒ compensation +82. Scissions (sans effet net) : Espèces +40, Banque +15 +15.
 */
export const APRES = {
  poches: {
    "poche-archivee": "0.00",
    "poche-banque": "160.00",
    "poche-especes": "894.50",
    "poche-na-1": "15.00",
  },
  /** Σ T des documents issus d'une vente (655) + Σ payés nets des commandes sans vente (295). = 895 + 5 + 45 + 5 */
  encaisseNouveau: "950.00",
  /** 655 + Σ payés plafonnés des commandes confirmées/livrées sans vente (245) = 895 − (−5) */
  encaissePerimetreAncien: "900.00",
  aEncaisser: "450.00",
  /** 950 − coûts 416 (386 + 30 de coût rendu à la paire livrée) − dépenses 210 */
  margeNette: "324.00",
  compensation: { poche: "poche-na-1", montant: "82.00" },
  comptages: { documents: 22, lignes: 24, paiements: 25, mouvementsHistoriques: 34 },
  categories: { paiement: 19, depense: 1, manuel: 6, ecart: 8 },
};

/** Catégorie et motif attendus de chaque mouvement historique (03 §7.6, V5). */
export const MOUVEMENTS: Record<string, [categorie: string, motif: string]> = {
  "mv-ajustement": ["manuel", "ajustement"],
  "mv-annulee-acompte": ["paiement", "paiement lié à sa pièce"],
  "mv-depense-divergente": ["ecart", "montant de dépense divergent"],
  "mv-depense-liee": ["depense", "dépense liée à sa pièce"],
  "mv-directe-bq": ["paiement", "encaissement de vente lié"],
  "mv-directe-esp": ["paiement", "encaissement de vente lié"],
  "mv-divergent": ["ecart", "montant de paiement divergent"],
  "mv-doublon-1": ["paiement", "paiement lié à sa pièce"],
  "mv-doublon-2": ["ecart", "doublon de mouvement"],
  "mv-excedent-bq": ["paiement", "encaissement de vente scindé (excédent en écart)"],
  "mv-excedent-esp": ["paiement", "encaissement de vente lié"],
  "mv-fournisseur": ["manuel", "paiement fournisseur"],
  "mv-negatif-vente": ["paiement", "encaissement de vente lié"],
  "mv-orphelin-depense": ["ecart", "origine supprimée"],
  "mv-orphelin-vente": ["ecart", "origine supprimée"],
  "mv-paire-annulee-acompte": ["paiement", "paiement lié à sa pièce"],
  "mv-paire-annulee-vente": ["paiement", "encaissement de vente scindé (excédent en écart)"],
  "mv-paire-attente-vente": ["paiement", "encaissement de vente lié"],
  "mv-paire-livree-acompte": ["paiement", "paiement lié à sa pièce"],
  "mv-paire-livree-vente": ["paiement", "encaissement de vente scindé (excédent en écart)"],
  "mv-partielle-acompte": ["paiement", "paiement lié à sa pièce"],
  "mv-purgee-acompte": ["ecart", "origine supprimée"],
  "mv-purgee-vente": ["paiement", "encaissement de vente lié"],
  "mv-rembourse-refund": ["paiement", "remboursement lié à sa pièce"],
  "mv-rembourse-solde": ["paiement", "paiement lié à sa pièce"],
  "mv-remontee-acompte": ["paiement", "paiement lié à sa pièce"],
  "mv-remontee-vente": ["ecart", "excédent de finalisation (double comptage)"],
  "mv-repartition-in": ["manuel", "transfert"],
  "mv-repartition-out": ["manuel", "transfert"],
  "mv-reste-na": ["paiement", "encaissement de vente lié"],
  "mv-transfert-arc-in": ["manuel", "transfert"],
  "mv-transfert-arc-out": ["manuel", "transfert"],
  "mv-transfert-seul": ["ecart", "transfert incomplet"],
  "mv-trop-percu": ["paiement", "paiement lié à sa pièce"],
};

/** Mouvements créés : [poche, montant signé, date de valeur ISO ou null pour « instant de la reprise », contre-passé]. */
export const CREATIONS: Record<string, [poche: string, montant: string, date: string | null, reverses: string | null]> = {
  "mig-compensation-poche-na-1": ["poche-na-1", "82.00", null, null],
  "mig-dep-depense-divergente": ["poche-na-1", "-42.00", "2026-04-20T14:00:00.000Z", null],
  "mig-dep-depense-sans-mouvement": ["poche-na-1", "-150.00", "2026-03-03T08:00:00.000Z", null],
  "mig-pay-pt-annule-origine": ["poche-na-1", "30.00", "2026-07-01T10:30:00.000Z", null],
  "mig-pay-pt-annule-refund": ["poche-na-1", "-30.00", "2026-07-01T10:30:00.000Z", "mig-pay-pt-annule-origine"],
  "mig-pay-pt-attente-acompte": ["poche-na-1", "25.00", "2026-06-01T10:00:00.000Z", null],
  "mig-pay-pt-divergent-acompte": ["poche-na-1", "30.00", "2026-08-12T10:10:00.000Z", null],
  "mig-reprise-vente-avant-tresorerie": ["poche-na-1", "85.00", "2026-01-20T10:00:00.000Z", null],
  "mig-reprise-vente-paire-remontee": ["poche-na-1", "-30.00", "2026-08-28T10:00:00.000Z", null],
  "mig-scission-mv-excedent-bq": ["poche-banque", "15.00", "2026-07-15T12:00:00.000Z", null],
  "mig-scission-mv-paire-annulee-vente": ["poche-banque", "15.00", "2026-05-16T17:00:00.000Z", null],
  "mig-scission-mv-paire-livree-vente": ["poche-especes", "40.00", "2026-04-15T18:00:00.000Z", null],
};

/** Documents : [origine, statut, confirmedAt, deliveredAt, cancelledAt, client, lot, payé, dû]. */
export const DOCUMENTS: Record<
  string,
  [origine: string, statut: string, confirmedAt: string | null, deliveredAt: string | null, cancelledAt: string | null, client: string | null, lot: string | null, paye: string, du: string]
> = {
  // Paires : confirmedAt = premier acompte s'il précède la vente, sinon soldAt (03 §7.7).
  "cmd-paire-livree": ["ORDER", "DELIVERED", "2026-04-02T12:00:00.000Z", "2026-04-15T18:00:00.000Z", null, "cli-karim", "lot-avril", "90.00", "0.00"],
  "cmd-paire-attente": ["ORDER", "DELIVERED", "2026-05-06T15:30:00.000Z", "2026-05-06T15:30:00.000Z", null, "cli-sofia", null, "50.00", "0.00"],
  "cmd-paire-annulee": ["ORDER", "DELIVERED", "2026-05-12T10:00:00.000Z", "2026-05-16T17:00:00.000Z", null, null, null, "35.00", "0.00"],
  "cmd-paire-remontee": ["ORDER", "DELIVERED", "2026-08-25T09:30:00.000Z", "2026-08-28T10:00:00.000Z", null, "cli-amina", null, "50.00", "50.00"],
  // Commandes sans vente.
  "cmd-attente-acompte": ["ORDER", "PENDING", null, null, null, "cli-amina", null, "25.00", "85.00"],
  "cmd-confirmee-partielle": ["ORDER", "CONFIRMED", "2026-06-06T11:00:00.000Z", null, null, "cli-karim", "lot-avril", "60.00", "120.00"],
  "cmd-annulee-acompte": ["ORDER", "CANCELLED", null, null, "2026-06-14T09:30:00.000Z", null, null, "20.00", "28.00"],
  "cmd-paiement-annule": ["ORDER", "CONFIRMED", "2026-07-01T10:30:00.000Z", null, null, "cli-sofia", null, "0.00", "65.00"],
  // Livrée à 17:00, soldée à 17:30 : l'engagement ne suit pas la livraison (décision J2, 03 §7.7).
  "cmd-rembourse": ["ORDER", "DELIVERED", "2026-07-08T17:00:00.000Z", "2026-07-08T17:00:00.000Z", null, "cli-amina", null, "90.00", "10.00"],
  "cmd-ligne-sans-nom": ["ORDER", "PENDING", null, null, null, null, null, "0.00", "40.00"],
  "cmd-doublon": ["ORDER", "CONFIRMED", "2026-08-10T09:15:00.000Z", null, null, "cli-amina", null, "35.00", "35.00"],
  "cmd-divergent": ["ORDER", "CONFIRMED", "2026-08-12T10:10:00.000Z", null, null, "cli-karim", null, "30.00", "30.00"],
  "cmd-confirmee-sans-paiement": ["ORDER", "CONFIRMED", "2026-08-30T08:00:00.000Z", null, null, null, null, "0.00", "25.00"],
  // Livrée sans `deliveredAt`, prévue le 20/09 : livraison = updatedAt (02/09 12:00), jamais la date prévue.
  "cmd-trop-percu": ["ORDER", "DELIVERED", "2026-09-02T11:00:00.000Z", "2026-09-02T12:00:00.000Z", null, "cli-sofia", null, "35.00", "0.00"],
  // Ventes sans commande.
  "vente-directe-payee": ["DIRECT_SALE", "DELIVERED", "2026-03-05T14:00:00.000Z", "2026-03-05T14:00:00.000Z", null, "cli-amina", "lot-mars", "120.00", "0.00"],
  "vente-reste-du": ["DIRECT_SALE", "DELIVERED", "2026-04-10T11:00:00.000Z", "2026-04-10T11:00:00.000Z", null, "cli-karim", null, "20.00", "25.00"],
  "vente-cmd-purgee": ["DIRECT_SALE", "DELIVERED", "2026-03-20T16:00:00.000Z", "2026-03-20T16:00:00.000Z", null, "cli-sofia", null, "80.00", "0.00"],
  "vente-ventilation-excedent": ["DIRECT_SALE", "DELIVERED", "2026-07-15T12:00:00.000Z", "2026-07-15T12:00:00.000Z", null, null, null, "75.00", "0.00"],
  "vente-don-volume-nul": ["DIRECT_SALE", "DELIVERED", "2026-08-05T15:00:00.000Z", "2026-08-05T15:00:00.000Z", null, "cli-karim", "lot-mars", "0.00", "60.00"],
  "vente-reste-negatif": ["DIRECT_SALE", "DELIVERED", "2026-08-20T11:00:00.000Z", "2026-08-20T11:00:00.000Z", null, "cli-sofia", null, "50.00", "0.00"],
  "vente-reste-excessif": ["DIRECT_SALE", "DELIVERED", "2026-08-21T10:00:00.000Z", "2026-08-21T10:00:00.000Z", null, null, null, "0.00", "30.00"],
  "vente-avant-tresorerie": ["DIRECT_SALE", "DELIVERED", "2026-01-20T10:00:00.000Z", "2026-01-20T10:00:00.000Z", null, "cli-karim", null, "85.00", "0.00"],
};

/** Listes d'arbitrage R4 : identifiants attendus, triés. */
export const R4: Record<string, string[]> = {
  ecartsAArbitrer: ["cmd-paire-remontee"],
  horsCatalogueReconstituees: ["ol-sans-nom-1"],
  /** Hors 10/50/80 : 75 ml, contenance héritée 30 ml non traduite, volume nul. */
  volumesAtypiques: ["ol-sans-nom-1", "ol-sans-paiement-1", "vl-volume-nul"],
  donsPrixNonNul: ["vl-don-prix"],
  coutsDzdSansTaux: [],
  autresLignesHorsRegles: [],
  catalogueHorsRegles: [],
  pairesCommandeNonLivree: ["cmd-paire-annulee", "cmd-paire-attente"],
  coutsEnrichis: ["vl-paire-livree-1"],
  coutsInconnus: ["ol-partielle-2", "ol-sans-nom-1"],
  stocksPassesANull: ["2", "3"],
  liensClientRecuperes: ["cmd-paire-livree"],
  liensLotRecuperes: ["cmd-paire-livree"],
  cachesAcompteDivergents: ["cmd-divergent"],
  resteDuHorsBornes: ["vente-reste-excessif", "vente-reste-negatif"],
  documentsSansClient: ["vente-ventilation-excedent"],
  pochesSystemeFusionnees: ["poche-na-2"],
  pocheSystemeCreee: [],
  tauxDeChangeIllisible: [],
};

/** V8 après le contract : contraintes restées NOT VALID et leurs lignes. */
export const V8 = {
  line_gift_ck: ["vl-don-prix"],
  line_volume_ck: ["ol-sans-nom-1", "ol-sans-paiement-1", "vl-volume-nul"],
};
