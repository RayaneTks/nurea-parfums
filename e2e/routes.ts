import { ROUTE_SPECS, routes, withSheet, type RouteName } from "../src/app-shell/routes";
import { SESSION_HINT_COOKIE } from "../src/app-shell/session-hint";
import { figurePeriodLabel } from "../src/contracts/compta";
import { formatEur, parseEurInput } from "../src/domain/money";
import { NEWS_SEEN_KEY } from "../src/contracts/stats";
import { COMPTA_DOCS, COMPTA_MONTH, EMPTY_DAY, JOURNAL_MONTH } from "./fixtures/compta";

import { composerDraft, storedDraft } from "./fixtures/composer";
import { DOCS, PASSING } from "./fixtures/documents";
import { SEED, seedEntityId, seedPerfumeId } from "./fixtures/seed";

/**
 * Inventaire des écrans et des sheets LIVRÉS, consommé par `layout-invariants.spec.ts` (07 J4 ;
 * 06 §1.2 et §1.8). Chaque jalon d'écran y ajoute ses routes (et leurs cas : vues, filtres, sheets
 * ouvertes, clavier) ; la spec vérifie qu'aucun écran livré de `src/app-shell/routes.ts` n'y manque.
 */

export type ScreenCase = {
  /** Écran de 06 (E01…). */
  screen: string;
  route: RouteName;
  /** Libellé du cas (« vue Livrées », « clavier sur le prix »). */
  label: string;
  url: string;
  /** Rendu dans le shell (session exigée) ; E18 est hors shell. */
  shell: boolean;
  /** Libellés des champs éprouvés clavier ouvert, un par un. */
  keyboardFields?: string[];
  /** Cookies à poser avant (ex. témoin de session pour l'écran d'expiration). */
  cookies?: { name: string; value: string; path: string }[];
  /** Sélecteur attendu avant la mesure (contenu d'une sheet adressable, rendu après l'hydratation). */
  waitFor?: string;
  /** Stockage local posé avant le chargement (brouillon du composeur, 06 §1.8). */
  storage?: Record<string, string>;
};

/** Un geste d'ouverture : toucher un contrôle (nom accessible exact), ou saisir dans un champ (libellé exact). */
export type OpenStep = string | RegExp | { fill: string; text: string };

export type SheetCase = {
  /** Sheet ou dialogue de 06 (S17…). */
  sheet: string;
  label: string;
  /** Écran sous-jacent. */
  url: string;
  /**
   * Ouvre la sheet sur l'écran chargé : la recherche du header, ou un toucher sur un contrôle de l'écran
   * (nom accessible exact) puis la couche attendue (`drawer` : sheet vaul ; `viewer` : visionneuse).
   * Plusieurs touchers : une sheet ouverte depuis une autre (fiche `?doc=` → menu → S03), dans l'ordre.
   */
  open: "search" | { tap: string | RegExp | readonly OpenStep[]; role?: "button" | "link"; layer: "drawer" | "viewer" };
  keyboardFields?: string[];
  /** Stockage local posé avant le chargement (brouillon du composeur). */
  storage?: Record<string, string>;
};

const SAUVAGE = seedPerfumeId("Sauvage");
const STORY_PERFUME = seedPerfumeId(SEED.storyVisuals.perfume);
const DIOR = SEED.brands[0].id;

/**
 * S01 ouverte par `?doc=` sur un document de chaque cas de 06 §1.8, au-dessus de la liste d'où il s'ouvre ; le
 * contenu de la sheet est attendu (`waitFor`) avant la mesure. Édition en place : clavier ouvert sur le prix et la
 * note du document.
 */
const DOCUMENT_SHEET_CASES: ScreenCase[] = ([
  { label: "commande en attente", url: withSheet(routes.commandes(), { doc: DOCS.pending }), keyboardFields: ["Notes"] },
  { label: "commande confirmée partiellement livrée avec dû", url: withSheet(routes.commandes(), { doc: DOCS.partial }) },
  { label: "commande livrée soldée", url: withSheet(routes.commandes({ vue: "livrees" }), { doc: DOCS.deliveredPaid }) },
  { label: "vente directe avec dû", url: withSheet(routes.encaisser(), { doc: DOCS.saleDue }) },
  { label: "document annulé avec paiements", url: withSheet(routes.commandes({ vue: "annulees" }), { doc: DOCS.cancelled }) },
  { label: "document au coût à compléter", url: withSheet(routes.commandes(), { doc: DOCS.unknownCost }) },
  {
    label: "édition en place des articles",
    url: withSheet(routes.commandes(), { doc: DOCS.pending, edition: true }),
    keyboardFields: ["Prix de Libre"],
  },
  { label: "document introuvable", url: withSheet(routes.accueil(), { doc: "e2e0d0c0-0000-4000-8000-999999999999" }) },
] as { label: string; url: string; keyboardFields?: string[] }[]).map((entry) => ({
  screen: "S01",
  route: entry.url.startsWith(routes.encaisser()) ? ("encaisser" as const) : entry.url.startsWith(routes.commandes()) ? ("commandes" as const) : ("accueil" as const),
  shell: true,
  waitFor: "[data-document-sheet], [data-lines-editor], [data-vaul-drawer] h2",
  ...entry,
}));

/** J12 — mois des chiffres de la Compta (ventes, dépense, coût à compléter) et poche « Banque » du journal. */
const COMPTA_REF = COMPTA_MONTH.ref();
const BANK = SEED.pockets[2].id;
/** Nom accessible de la rangée « Marge nette · <mois> » (06 E03 zone 2 → S19). */
export const margeNetteRow = (ref: string | null) => `Marge nette · ${figurePeriodLabel("mois", ref)} : voir le détail`;

/** Témoin de la carte « Nouveautés » déjà fermée : l'Accueil se mesure sans elle (J14, 06 E01 zone 2). */
const NEWS_SEEN: Record<string, string> = { [NEWS_SEEN_KEY]: "1" };

/** Champs du formulaire parfum éprouvés un par un, clavier ouvert (07 J11 : « clavier ouvert sur chaque champ »). */
const PERFUME_FIELDS = ["Nom du parfum", "Prix du 80 ml", "Coût du 80 ml en dinars", "Taux du 80 ml"];

/** Fiches du jeu e2e par prénom (J10). */
const customerId = (firstName: string) => {
  const found = SEED.customers.find((customer) => customer.fullName.startsWith(`${firstName} `));
  if (!found) throw new Error(`e2e/routes : client « ${firstName} » absent du jeu.`);
  return found.id;
};

/**
 * Champs du formulaire client éprouvés un par un, clavier ouvert (07 J10 : « E20 clavier ouvert »).
 *
 * « Nom », sans astérisque : `FormField` place l'astérisque HORS du `<label>` (« le texte du libellé reste
 * exactement le libellé — celui qu'un test d'écran vise »). J10 avait écrit « Nom* », ce qui marchait avec le
 * `FormField` de l'époque ; depuis la correction du design system, `getByLabel("Nom*")` ne trouve plus rien et
 * ces quatre cas de `test:layout` échouaient sur un `focus()` en timeout. Corrigé à J14.
 */
const CUSTOMER_FIELDS = ["Nom", "Téléphone", "Snap", "WhatsApp", "Adresse", "Notes"];

/** J10 — Clients (06 E12, E14, E20) : liste et ses états, fiche dans chacun de ses cas, formulaire clavier ouvert. */
const CUSTOMER_SCREENS: ScreenCase[] = [
  { screen: "E12", route: "clients", label: "liste A–Z, recherche clavier ouvert", url: routes.clients(), shell: true, keyboardFields: ["Rechercher un client"] },
  { screen: "E12", route: "clients", label: "recherche « 06 12 »", url: routes.clients({ q: "06 12" }), shell: true },
  { screen: "E12", route: "clients", label: "« Afficher plus » : deux pages", url: routes.clients({ pages: 2 }), shell: true },
  { screen: "E12", route: "clients", label: "vide de filtre", url: routes.clients({ q: "introuvable" }), shell: true },
  { screen: "E14", route: "client", label: "fiche avec créance, contacts, Achète souvent", url: routes.client(customerId("Nora")), shell: true },
  { screen: "E14", route: "client", label: "fiche soldée : Partager le récap", url: routes.client(customerId("Élise")), shell: true },
  { screen: "E14", route: "client", label: "fiche sans moyen de contact, commande en cours", url: routes.client(customerId("Sarah")), shell: true },
  { screen: "E14", route: "client", label: "fiche sans document", url: routes.client(seedEntityId("zoeclient01")), shell: true },
  { screen: "E14", route: "client", label: "fiche introuvable", url: routes.client(seedEntityId("clientinconnu")), shell: true },
  { screen: "E20", route: "nouveauClient", label: "nouveau client", url: routes.nouveauClient(), shell: true, keyboardFields: CUSTOMER_FIELDS },
  { screen: "E20", route: "nouveauClient", label: "nom pré-rempli, alerte d'homonyme", url: routes.nouveauClient({ nom: "fares benali" }), shell: true },
  { screen: "E20", route: "modifierClient", label: "modifier une fiche", url: routes.modifierClient(customerId("Fares")), shell: true, keyboardFields: CUSTOMER_FIELDS },
  { screen: "E20", route: "modifierClient", label: "fiche introuvable", url: routes.modifierClient(seedEntityId("clientinconnu")), shell: true },
];

export const SCREENS: ScreenCase[] = [
  {
    screen: "E18",
    route: "connexion",
    label: "connexion",
    url: routes.connexion(),
    shell: false,
    keyboardFields: ["Identifiant", "Mot de passe"],
  },
  {
    screen: "E18",
    route: "connexion",
    label: "après expiration de session",
    url: routes.connexion({ retour: routes.commandes({ filtre: "retard" }) }),
    shell: false,
    keyboardFields: ["Identifiant", "Mot de passe"],
    cookies: [{ name: SESSION_HINT_COOKIE, value: "1", path: "/admin" }],
  },
  // J14 — Accueil définitif (06 E01), Récap du jour (E02) et Statistiques (E07).
  // La carte « Nouveautés » est fermée pour ces cas (elle a sa propre mesure) : le stockage porte son témoin.
  { screen: "E01", route: "accueil", label: "cas nominal, carte Nouveautés fermée", url: routes.accueil(), shell: true, storage: NEWS_SEEN },
  { screen: "E01", route: "accueil", label: "carte « Nouveautés » au premier lancement", url: routes.accueil(), shell: true },
  {
    screen: "E01",
    route: "accueil",
    label: "fiche document ouverte au-dessus de l'Accueil",
    url: withSheet(routes.accueil(), { doc: DOCS.saleDue }),
    shell: true,
    storage: NEWS_SEEN,
    waitFor: "[data-document-sheet]",
  },
  { screen: "E02", route: "journee", label: "récap d'aujourd'hui", url: routes.journee(), shell: true },
  { screen: "E02", route: "journee", label: "récap d'un jour à ventes et poches", url: routes.journee({ jour: COMPTA_MONTH.busyDay() }), shell: true },
  { screen: "E02", route: "journee", label: "récap d'un jour vide", url: routes.journee({ jour: EMPTY_DAY() }), shell: true },
  { screen: "E07", route: "statistiques", label: "classement du mois", url: routes.statistiques(), shell: true },
  { screen: "E07", route: "statistiques", label: "classement d'un mois à ventes, deux pages", url: routes.statistiques({ ref: COMPTA_REF, pages: 2 }), shell: true },
  { screen: "E07", route: "statistiques", label: "classement depuis toujours", url: routes.statistiques({ periode: "tout" }), shell: true },
  { screen: "E07", route: "statistiques", label: "période sans vente", url: routes.statistiques({ periode: "jour", ref: EMPTY_DAY() }), shell: true },
  // J8 — Commandes, À encaisser, fiche document (06 E10, E13, S01 ; §1.8 : les six cas de la fiche, édition clavier ouvert).
  { screen: "E10", route: "commandes", label: "vue À livrer, recherche clavier ouvert", url: routes.commandes(), shell: true, keyboardFields: ["Rechercher une commande"] },
  { screen: "E10", route: "commandes", label: "À livrer, filtre « En retard » venu d'un lien", url: routes.commandes({ filtre: "retard" }), shell: true },
  { screen: "E10", route: "commandes", label: "À livrer, chip « En attente »", url: routes.commandes({ filtre: "en-attente" }), shell: true },
  { screen: "E10", route: "commandes", label: "vue Livrées", url: routes.commandes({ vue: "livrees" }), shell: true },
  { screen: "E10", route: "commandes", label: "vue Annulées", url: routes.commandes({ vue: "annulees" }), shell: true },
  { screen: "E10", route: "commandes", label: "vide de filtre", url: routes.commandes({ q: "introuvable" }), shell: true },
  { screen: "E13", route: "encaisser", label: "À encaisser", url: routes.encaisser(), shell: true },
  { screen: "E13", route: "encaisser", label: "Plus de 30 jours, recherche clavier ouvert", url: routes.encaisser({ anciennete: 30, q: "ya" }), shell: true, keyboardFields: ["Rechercher un client"] },
  ...DOCUMENT_SHEET_CASES,
  // J12 — Compta (06 E03 : deux vues, période « Tout », filtre, recherche clavier ouvert) et Journal (E04).
  { screen: "E03", route: "compta", label: "vue Ventes, mois courant", url: routes.compta(), shell: true },
  { screen: "E03", route: "compta", label: "vue Ventes, mois passé avec dépense et coût à compléter", url: routes.compta({ ref: COMPTA_REF }), shell: true },
  { screen: "E03", route: "compta", label: "vue Ventes, période Tout", url: routes.compta({ periode: "tout" }), shell: true },
  { screen: "E03", route: "compta", label: "vue Ventes, période Jour", url: routes.compta({ periode: "jour" }), shell: true },
  { screen: "E03", route: "compta", label: "vue Ventes, semaine", url: routes.compta({ periode: "semaine" }), shell: true },
  { screen: "E03", route: "compta", label: "vue Ventes, année", url: routes.compta({ periode: "annee" }), shell: true },
  {
    screen: "E03",
    route: "compta",
    label: "filtre « Coût à compléter » venu d'un lien, période Tout",
    url: routes.compta({ periode: "tout", filtre: "cout-a-completer" }),
    shell: true,
  },
  {
    screen: "E03",
    route: "compta",
    label: "recherche clavier ouvert",
    url: routes.compta({ periode: "tout", q: "sa" }),
    shell: true,
    keyboardFields: ["Rechercher un document"],
  },
  { screen: "E03", route: "compta", label: "vide de recherche", url: routes.compta({ periode: "tout", q: "introuvable" }), shell: true },
  { screen: "E03", route: "compta", label: "vue Trésorerie", url: routes.compta({ vue: "tresorerie" }), shell: true },
  {
    screen: "E03",
    route: "compta",
    label: "fiche d'une vente ouverte depuis la Compta",
    url: withSheet(routes.compta({ ref: COMPTA_REF }), { doc: COMPTA_DOCS.sale }),
    shell: true,
    waitFor: "[data-document-sheet]",
  },
  { screen: "E04", route: "journal", label: "journal du mois courant", url: routes.journal(), shell: true },
  { screen: "E04", route: "journal", label: "mois à 45 mouvements", url: routes.journal({ mois: JOURNAL_MONTH.key() }), shell: true },
  { screen: "E04", route: "journal", label: "filtré sur une poche", url: routes.journal({ poche: BANK }), shell: true },
  ...CUSTOMER_SCREENS,

  // J9 — Composeur Vendre (06 E11 ; §1.8 : brouillon d'une ligne en mode Vente puis Commande, clavier sur le prix).
  { screen: "E11", route: "vendre", label: "composeur vide, grille des récents", url: routes.vendre(), shell: true, waitFor: "[data-recent-tile]" },
  {
    screen: "E11",
    route: "vendre",
    label: "brouillon d'une ligne en mode Vente",
    url: routes.vendre(),
    shell: true,
    waitFor: "[data-composer-cta]",
    storage: storedDraft(composerDraft({ mode: "vente" })),
    keyboardFields: ["Prix de Asad", "Reçu maintenant"],
  },
  {
    screen: "E11",
    route: "vendre",
    label: "brouillon d'une ligne en mode Commande, client posé",
    url: routes.vendre(),
    shell: true,
    waitFor: "[data-composer-cta]",
    storage: storedDraft(composerDraft({ mode: "commande", customer: "Fares" })),
    keyboardFields: ["Prix de Asad", "Acompte", "Coût en dinars de Asad"],
  },
  {
    screen: "E11",
    route: "vendre",
    label: "Nouvelle commande, rien de saisi",
    url: routes.vendre({ mode: "commande" }),
    shell: true,
    waitFor: "[data-composer-cta]",
  },
  {
    screen: "E11",
    route: "vendre",
    label: "bandeau de reprise (brouillon en cours, « Vendre » d'un parfum)",
    url: routes.vendre({ parfum: SAUVAGE }),
    shell: true,
    waitFor: "[data-resume-banner]",
    storage: storedDraft(composerDraft({ mode: "vente", quantity: 2 })),
  },
  {
    screen: "E11",
    route: "vendre",
    label: "« Refaire » : lignes, client et lot repris",
    url: routes.vendre({ depuis: DOCS.refaire }),
    shell: true,
    waitFor: "[data-composer-cta]",
  },
  // J11 — Catalogue (06 §3.5, 07 J11 : trois onglets, filtres actifs, fiches, formulaires clavier ouvert).
  { screen: "E15", route: "catalogue", label: "onglet Parfums", url: routes.catalogue(), shell: true, keyboardFields: ["Rechercher dans le catalogue"] },
  { screen: "E15", route: "catalogue", label: "Parfums, filtre stock bas venu d'un lien", url: routes.catalogue({ stock: "bas" }), shell: true },
  { screen: "E15", route: "catalogue", label: "Parfums, masqués et recherche", url: routes.catalogue({ visibilite: "masques", q: "la" }), shell: true },
  { screen: "E15", route: "catalogue", label: "Parfums, vide de filtre", url: routes.catalogue({ q: "introuvable" }), shell: true },
  { screen: "E15", route: "catalogue", label: "onglet Marques", url: routes.catalogue({ tab: "marques" }), shell: true },
  { screen: "E15", route: "catalogue", label: "onglet En avant", url: routes.catalogue({ tab: "en-avant" }), shell: true },
  { screen: "E16", route: "parfum", label: "fiche sans visuel story", url: routes.parfum(SAUVAGE), shell: true },
  { screen: "E16", route: "parfum", label: "fiche avec 3 visuels story", url: routes.parfum(STORY_PERFUME), shell: true },
  { screen: "E16", route: "parfum", label: "parfum introuvable", url: routes.parfum(999_999), shell: true },
  { screen: "E19", route: "nouveauParfum", label: "nouveau parfum", url: routes.nouveauParfum(), shell: true, keyboardFields: PERFUME_FIELDS },
  { screen: "E19", route: "nouveauParfum", label: "dupliquer un parfum", url: routes.nouveauParfum({ dupliquer: SAUVAGE }), shell: true },
  { screen: "E19", route: "modifierParfum", label: "modifier un parfum", url: routes.modifierParfum(SAUVAGE), shell: true, keyboardFields: PERFUME_FIELDS },
  { screen: "E17", route: "nouvelleMarque", label: "nouvelle marque", url: routes.nouvelleMarque(), shell: true, keyboardFields: ["Nom de la marque"] },
  { screen: "E17", route: "modifierMarque", label: "modifier une marque", url: routes.modifierMarque(DIOR), shell: true, keyboardFields: ["Nom de la marque"] },
];

export const SHEETS: SheetCase[] = [
  { sheet: "S17", label: "recherche ouverte", url: routes.accueil(), open: "search", keyboardFields: ["Rechercher"] },
  { sheet: "S17", label: "recherche ouverte hors racine", url: routes.clients({ q: "fa" }), open: "search", keyboardFields: ["Rechercher"] },
  {
    sheet: "S05",
    label: "sélecteur de marque depuis le formulaire parfum",
    url: routes.nouveauParfum(),
    open: { tap: "Choisir la marque", layer: "drawer" },
    keyboardFields: ["Rechercher une marque"],
  },
  {
    sheet: "S20",
    label: "ajuster le stock",
    url: routes.parfum(SAUVAGE),
    open: { tap: "Ajuster le stock", layer: "drawer" },
    keyboardFields: ["Quantité en stock"],
  },
  {
    sheet: "E16 zone 7",
    label: "visionneuse plein écran d'un visuel story",
    url: routes.parfum(STORY_PERFUME),
    open: { tap: "Ouvrir Story 9:16", layer: "viewer" },
  },
  // J8 — S02 ouverte depuis E13 (06 §1.8), clavier ouvert sur le montant ; variante « Tout encaisser ».
  {
    sheet: "S02",
    label: "Encaisser depuis À encaisser",
    url: routes.encaisser(),
    open: { tap: `Encaisser ${euros("80")} · ${PASSING.creance}`, layer: "drawer" },
    keyboardFields: ["Montant encaissé"],
  },
  {
    sheet: "S02",
    label: "Tout encaisser d'un client",
    url: routes.encaisser(),
    open: { tap: `Tout encaisser ${euros("120")}`, layer: "drawer" },
    keyboardFields: ["Montant encaissé"],
  },
  // S02 variante Acompte, S03 et S04 : ouvertes depuis la fiche (`?doc=`), au-dessus d'elle.
  {
    sheet: "S02",
    label: "Acompte depuis la fiche",
    url: withSheet(routes.commandes(), { doc: DOCS.pending }),
    open: { tap: "Encaisser un acompte", layer: "drawer" },
    keyboardFields: ["Montant encaissé"],
  },
  {
    sheet: "S03",
    label: "Annuler une commande payée, remboursement proposé",
    url: withSheet(routes.commandes(), { doc: DOCS.partial }),
    open: { tap: ["Plus d'actions", "Annuler la commande"], layer: "drawer" },
    keyboardFields: ["Montant remboursé"],
  },
  {
    sheet: "S04",
    label: "Corriger un acompte",
    url: withSheet(routes.commandes(), { doc: DOCS.partial }),
    open: { tap: [/^Actions : Acompte du /, "Corriger"], layer: "drawer" },
    keyboardFields: ["Montant", "Note"],
  },
  {
    sheet: "S09",
    label: "Relancer un client",
    url: routes.encaisser(),
    open: { tap: "Relancer", layer: "drawer" },
    keyboardFields: ["Message"],
  },
  // J10 — depuis la fiche client (06 E14) : S09 dans ses deux gestes, S02 « Tout encaisser » du CTA.
  {
    sheet: "S09",
    label: "Relancer depuis la fiche client",
    url: routes.client(customerId("Nora")),
    open: { tap: "Relancer", layer: "drawer" },
    keyboardFields: ["Message"],
  },
  {
    sheet: "S09",
    label: "Partager le récap depuis la fiche client",
    url: routes.client(customerId("Élise")),
    open: { tap: "Partager le récap", layer: "drawer" },
    keyboardFields: ["Message"],
  },
  {
    sheet: "S02",
    label: "Tout encaisser depuis la fiche client",
    url: routes.client(customerId("Nora")),
    open: { tap: `Encaisser ${euros("160")}`, layer: "drawer" },
    keyboardFields: ["Montant encaissé"],
  },

  // J12 — Compta et Trésorerie (07 J12 : S15 clavier ouvert, S16, S19 ; S14 et S21).
  {
    sheet: "S19",
    label: "Détail de la Marge nette d'un mois avec dépense et coût à compléter",
    url: routes.compta({ ref: COMPTA_REF }),
    open: { tap: margeNetteRow(COMPTA_REF), layer: "drawer" },
  },
  {
    sheet: "S15",
    label: "Nouveau mouvement (Transfert)",
    url: routes.compta({ vue: "tresorerie" }),
    open: { tap: "Nouveau mouvement", layer: "drawer" },
    keyboardFields: ["Montant"],
  },
  {
    sheet: "S15",
    label: "Répartir le non attribué",
    url: routes.compta({ vue: "tresorerie" }),
    open: { tap: "Répartir", layer: "drawer" },
    keyboardFields: ["Montant"],
  },
  {
    sheet: "S14",
    label: "Poche Coffre",
    url: routes.compta({ vue: "tresorerie" }),
    open: { tap: "Poche Coffre", layer: "drawer" },
  },
  {
    sheet: "S14 → S15",
    label: "Transférer depuis la poche Banque, clavier ouvert",
    url: routes.compta({ vue: "tresorerie" }),
    open: { tap: ["Poche Banque", "Transférer"], layer: "drawer" },
    keyboardFields: ["Montant"],
  },
  {
    sheet: "S16",
    label: "Nouvelle poche",
    url: routes.compta({ vue: "tresorerie" }),
    open: { tap: "Nouvelle poche", layer: "drawer" },
    keyboardFields: ["Nom de la poche", "Solde d'ouverture"],
  },
  {
    sheet: "S21",
    label: "Ordre des poches",
    url: routes.compta({ vue: "tresorerie" }),
    open: { tap: "Ordre", layer: "drawer" },
  },

  // J9 — sheets du composeur (06 S05 hors catalogue, S06 + client de passage, S07, S08).
  {
    sheet: "S05",
    label: "sélecteur de parfum du composeur, recherche clavier ouvert",
    url: routes.vendre(),
    open: { tap: "Rechercher un parfum", layer: "drawer" },
    keyboardFields: ["Parfum ou marque"],
  },
  {
    sheet: "S05",
    label: "sous-formulaire « Hors catalogue »",
    url: routes.vendre(),
    open: {
      tap: ["Rechercher un parfum", { fill: "Parfum ou marque", text: "lattafa oud" }, "Hors catalogue : « lattafa oud »"],
      layer: "drawer",
    },
    keyboardFields: ["Nom du parfum", "Marque"],
  },
  {
    sheet: "S06",
    label: "client depuis « Nouvelle commande »",
    url: routes.vendre({ mode: "commande" }),
    open: { tap: "Choisir le client", layer: "drawer" },
    keyboardFields: ["Nom, téléphone, Snap"],
  },
  {
    sheet: "S06",
    label: "client de passage : nom et contact",
    url: routes.vendre({ mode: "commande" }),
    open: { tap: ["Choisir le client", /^Client de passage/], layer: "drawer" },
    keyboardFields: ["Nom du client", "Contact"],
  },
  {
    sheet: "S07",
    label: "lot depuis le composeur",
    url: routes.vendre({ mode: "commande" }),
    open: { tap: "Lot : Commande de mars", layer: "drawer" },
    keyboardFields: ["Chercher ou nommer un lot"],
  },
  {
    sheet: "S08",
    label: "plusieurs poches",
    url: routes.vendre(),
    storage: storedDraft(composerDraft({ mode: "vente" })),
    open: { tap: "Plusieurs poches…", layer: "drawer" },
    keyboardFields: ["Espèces", "Banque"],
  },
];

/** « 80,00 € » tel que l'écran l'écrit (espace fine insécable), pour viser un nom accessible exact. */
function euros(amount: string): string {
  return formatEur(parseEurInput(amount) as NonNullable<ReturnType<typeof parseEurInput>>);
}

/** Écrans livrés (définitifs ou provisoires) de `routes.ts` qui n'ont aucun cas ici. */
export function uncoveredRoutes(): RouteName[] {
  const covered = new Set(SCREENS.map((c) => c.route));
  return (Object.keys(ROUTE_SPECS) as RouteName[]).filter((name) => ROUTE_SPECS[name].etat !== "a-venir" && !covered.has(name));
}
