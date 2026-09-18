import { ROUTE_SPECS, routes, withSheet, type RouteName } from "../src/app-shell/routes";
import { SESSION_HINT_COOKIE } from "../src/app-shell/session-hint";
import { formatEur, parseEurInput } from "../src/domain/money";
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
};

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
  open: "search" | { tap: string | RegExp | readonly (string | RegExp)[]; role?: "button" | "link"; layer: "drawer" | "viewer" };
  keyboardFields?: string[];
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

/** Champs du formulaire parfum éprouvés un par un, clavier ouvert (07 J11 : « clavier ouvert sur chaque champ »). */
const PERFUME_FIELDS = ["Nom du parfum", "Prix du 80 ml", "Coût du 80 ml en dinars", "Taux du 80 ml"];

/** Fiches du jeu e2e par prénom (J10). */
const customerId = (firstName: string) => {
  const found = SEED.customers.find((customer) => customer.fullName.startsWith(`${firstName} `));
  if (!found) throw new Error(`e2e/routes : client « ${firstName} » absent du jeu.`);
  return found.id;
};

/**
 * Champs du formulaire client éprouvés un par un, clavier ouvert (07 J10 : « E20 clavier ouvert »). « Nom* » : le
 * libellé d'un champ requis porte son astérisque (`FormField required`), que `getByLabel` lit avec le texte.
 */
const CUSTOMER_FIELDS = ["Nom*", "Téléphone", "Snap", "WhatsApp", "Adresse", "Notes"];

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
  { screen: "E01", route: "accueil", label: "Accueil provisoire", url: routes.accueil(), shell: true },
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
  { screen: "E11", route: "vendre", label: "Vendre provisoire", url: routes.vendre(), shell: true },
  ...CUSTOMER_SCREENS,
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
