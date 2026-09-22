import "server-only";
import { canPublishBrand, canPublishPerfume, type PublicationVerdict } from "@/domain/publication";

/**
 * Le dictionnaire des messages d'erreur de base (04 §9.3). Seul `errors.ts` le lit. Chaque phrase
 * dit ce qui bloque et le geste qui débloque (04 §9.4) ; un writer qui connaît le contexte (nom
 * du client, de la marque) lève un `DomainError` plus précis avant que la base ne refuse.
 */

export const SESSION_EXPIRED_MESSAGE = "Ta session a expiré. Reconnecte-toi : ta saisie est gardée.";
export const VALIDATION_MESSAGE = "Certains champs sont à corriger : vérifie les messages sous chacun.";
export const BUSY_MESSAGE = "La base est occupée. Rien n'a été enregistré — réessaie.";
export const UNREACHABLE_MESSAGE = "La base ne répond pas. Rien n'a été enregistré — réessaie.";
export const UNREACHABLE_READ_MESSAGE = "La base ne répond pas. Réessaie dans un instant.";

export function unexpectedMessage(reference: string, operation: "write" | "read"): string {
  return operation === "write"
    ? `Une erreur imprévue a bloqué l'enregistrement. Rien n'a été modifié. (réf. ${reference})`
    : `Une erreur imprévue a empêché le chargement. Réessaie ; si ça persiste, note la référence. (réf. ${reference})`;
}

// Les textes de publication sont ceux des pré-contrôles de l'écran, pas une copie (04 §12).
const refusal = (verdict: PublicationVerdict) => (verdict.ok ? "" : verdict.message);
const INCOHERENT = "Cet enregistrement est incohérent : recharge la page et réessaie.";

/** CHECK de 03 §4.9, par nom de contrainte. */
export const CHECK_MESSAGES: Readonly<Record<string, string>> = {
  brand_complete_logo_ck: refusal(canPublishBrand({ catalogMode: "COMPLETE", image: null })),
  perfume_publish_image_ck: refusal(
    canPublishPerfume({ image: "" }, { name: "", status: "PUBLISHED", catalogMode: "CURATED", image: null }),
  ),
  perfume_stock_ck: "Le stock ne peut pas être négatif : indique 0 ou plus.",
  pricing_volume_ck: "Choisis un volume de 10, 50 ou 80 ml.",
  pricing_amounts_ck: "Les prix, coûts et taux de la grille doivent être positifs : corrige la grille tarifaire.",
  doc_confirmed_at_ck: INCOHERENT,
  doc_delivered_at_ck: INCOHERENT,
  doc_cancelled_at_ck: INCOHERENT,
  line_quantity_ck: "Indique une quantité d'au moins 1.",
  line_delivered_ck: "La quantité livrée doit rester entre 0 et la quantité de la ligne.",
  line_price_ck: "Indique un prix positif ou nul.",
  line_gift_ck: "Une ligne offerte est à 0 €.",
  line_volume_ck: "Choisis un volume de 10, 50 ou 80 ml pour cette ligne.",
  line_cost_ck: "Indique un coût positif, avec un taux supérieur à 0.",
  line_name_ck: "Indique le nom du parfum de cette ligne.",
  line_off_catalog_ck: INCOHERENT,
  pocket_system_ck: "La poche « Non attribué » ne se modifie pas et ne s'archive pas.",
  movement_nonzero_ck: "Indique un montant différent de 0.",
  movement_transfer_ck: INCOHERENT,
  movement_outflow_sign_ck: INCOHERENT,
  movement_not_self_ck: INCOHERENT,
  setting_singleton_ck: INCOHERENT,
  setting_rate_ck: "Indique un taux supérieur à 0.",
};

export const CHECK_FALLBACK_MESSAGE = "Cette saisie enfreint une règle de la gestion : vérifie-la et réessaie.";

/** Unicité (`P2002`), par « Modèle.champ[,champ] ». La clé primaire `id` relève du rejeu (04 §3.6). */
export const UNIQUE_MESSAGES: Readonly<Record<string, string>> = {
  "Customer.phoneE164": "Ce numéro est déjà celui d'une autre fiche client : ouvre-la plutôt que d'en créer une.",
  "Perfume.brandId,name": "Cette marque a déjà un parfum de ce nom : ouvre sa fiche ou choisis un autre nom.",
  "Brand.name": "Cette marque existe déjà : sélectionne-la dans la liste.",
  "Brand.slug": "Cette marque existe déjà : sélectionne-la dans la liste.",
  "CashMovement.reversesId": "Ce mouvement a déjà été annulé.",
  "AdminUser.username": "Cet identifiant est déjà pris : choisis-en un autre.",
};

export const UNIQUE_FALLBACK_MESSAGE = "Cet enregistrement existe déjà : recharge la page pour voir la version à jour.";

/** Suppression refusée par une clé étrangère `Restrict` (`P2003`), par nom de contrainte. */
export const RESTRICT_MESSAGES: Readonly<Record<string, string>> = {
  SaleDocument_batchId_fkey: "Ce lot porte encore des ventes ou des dépenses : clôture-le plutôt.",
  BatchExpense_batchId_fkey: "Ce lot porte encore des ventes ou des dépenses : clôture-le plutôt.",
  CashMovement_pocketId_fkey: "Cette poche a un historique : archive-la une fois son solde à 0.",
  Payment_documentId_fkey: "Ce document a des paiements : annule-le plutôt.",
};

export const RESTRICT_FALLBACK_MESSAGE = "Cet élément est encore lié à d'autres données : il ne peut pas être supprimé.";

/** Entité disparue (`P2025`, ou clé étrangère vers une ligne absente), par modèle. */
export const NOT_FOUND_MESSAGES: Readonly<Record<string, string>> = {
  SaleDocument: "Ce document n'existe plus. Il a peut-être été supprimé depuis un autre écran.",
  SaleLine: "Cette ligne n'existe plus. Recharge le document pour voir sa version à jour.",
  Payment: "Ce paiement n'existe plus. Recharge le document pour voir sa version à jour.",
  Customer: "Cette fiche client n'existe plus. Elle a peut-être été supprimée depuis un autre écran.",
  Batch: "Ce lot n'existe plus. Il a peut-être été supprimé depuis un autre écran.",
  BatchExpense: "Cette dépense n'existe plus. Recharge le lot pour voir sa version à jour.",
  Pocket: "Cette poche n'existe plus. Choisis-en une autre.",
  CashMovement: "Ce mouvement n'existe plus. Recharge le journal pour voir sa version à jour.",
  Brand: "Cette marque n'existe plus. Elle a peut-être été supprimée depuis un autre écran.",
  Perfume: "Ce parfum n'existe plus. Il a peut-être été supprimé depuis un autre écran.",
  PerfumePricing: "Ce tarif n'existe plus. Recharge la fiche du parfum.",
  AdminUser: "Ce compte n'existe plus : reconnecte-toi.",
};

export const NOT_FOUND_FALLBACK_MESSAGE = "Cet élément n'existe plus. Il a peut-être été supprimé depuis un autre écran.";

/** Modèle référencé par chaque clé étrangère : message quand la ligne visée a disparu. */
export const FOREIGN_KEY_TARGETS: Readonly<Record<string, string>> = {
  Perfume_brandId_fkey: "Brand",
  PerfumePricing_perfumeId_fkey: "Perfume",
  SaleDocument_customerId_fkey: "Customer",
  SaleDocument_batchId_fkey: "Batch",
  SaleLine_documentId_fkey: "SaleDocument",
  SaleLine_perfumeId_fkey: "Perfume",
  Payment_documentId_fkey: "SaleDocument",
  Payment_movementId_fkey: "CashMovement",
  BatchExpense_batchId_fkey: "Batch",
  BatchExpense_movementId_fkey: "CashMovement",
  CashMovement_pocketId_fkey: "Pocket",
  CashMovement_reversesId_fkey: "CashMovement",
  Setting_defaultPocketId_fkey: "Pocket",
};
