/**
 * Format de `reference.json` (docs/refonte/03-MODELE-DONNEES.md §7.2 ; 07-PLAN-EXECUTION.md §2.2, §2.5).
 *
 * `mesures` est déterministe : listes triées par identifiant, montants en chaînes à deux décimales.
 * Deux calculs sur les mêmes données donnent le même bloc `mesures` (contrôle du gel, 07 §1.6 B4) ;
 * seul `horodatages` diffère.
 */
import fs from "node:fs";
import type { Visuels } from "./visuels";

export const FORMAT_REFERENCE = "nurea-reference/1";

export interface PocheReference {
  id: string;
  nom: string;
  archivee: boolean;
  systeme: boolean;
  soldeOuverture: string;
  solde: string;
}

export interface VenteReference {
  id: string;
  commandeId: string | null;
  totalRevenue: string;
  remainingDue: string;
  /** LEAST(GREATEST(remainingDue, 0), totalRevenue) : dû affiché par la compta. */
  du: string;
}

export interface CommandeReference {
  id: string;
  statut: string;
  total: string;
  payeNet: string;
  /** GREATEST(total − payé net, 0). */
  du: string;
  aUneVente: boolean;
}

export interface Comptages {
  Order: number;
  OrderItem: number;
  Sale: number;
  SaleItem: number;
  PaymentTransaction: number;
  CashMovement: number;
  BatchExpense: number;
  Pocket: number;
  Customer: number;
  Batch: number;
  Brand: number;
  Perfume: number;
  PerfumePricing: number;
  /** Visuels story (table conservée en place, V5 et V11). */
  PerfumeMedia: number;
  paires: number;
  orderItemsHorsPaires: number;
}

export interface Vitrine {
  parfumsPublies: number;
  cartesGamme: number;
  marquesExplorer: number;
}

export interface Mesures {
  comptages: Comptages;
  poches: PocheReference[];
  tresorerie: { totalNonArchivees: string; nonAttribue: string };
  ventes: VenteReference[];
  commandes: CommandeReference[];
  encaisse: { ancien: string; d0: string; d1: string; d2: string };
  aEncaisser: { ancien: string };
  informatif: {
    /** Ancienne liste « À encaisser » (listOutstanding), reste dû des ventes non borné. */
    aEncaisserListeAncienne: string;
    /** Mois (UTC, comme l'ancien serveur) de l'Encaissé du mois courant. */
    mois: string;
    encaisseMoisAncien: string;
    coutsAncien: string;
    depensesAncien: string;
    margeNetteAncienne: string;
  };
  vitrine: Vitrine;
  /** Visuels story `PerfumeMedia` : nombre et empreinte, recalculés après le contract (V11). */
  visuels: Visuels;
}

export interface Reference {
  format: typeof FORMAT_REFERENCE;
  horodatages: { calculeLe: string; hote: string };
  mesures: Mesures;
}

export function lireReference(fichier: string): { reference: Reference; texte: string } {
  const texte = fs.readFileSync(fichier, "utf8");
  const reference = JSON.parse(texte) as Reference;
  if (reference?.format !== FORMAT_REFERENCE || !reference.mesures || !reference.horodatages) {
    throw new Error(`${fichier} n'est pas une référence de reprise (${FORMAT_REFERENCE}).`);
  }
  return { reference, texte };
}
