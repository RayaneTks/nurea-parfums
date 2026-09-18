/**
 * Constructeurs d'URL de la gestion — LE seul endroit où une URL d'écran s'écrit
 * (docs/refonte/04-ARCHITECTURE.md §2.2 ; inventaire de 06-ECRANS-PARCOURS.md §1.2).
 *
 * Un écran pas encore livré existe déjà ici, comme constructeur : les liens qui y mènent s'écrivent
 * une fois, au bon format, et le jour où la page arrive seul son `etat` change.
 * `tests/architecture/routes-builders.test.ts` vérifie qu'un écran marqué livré a son `page.tsx`, qu'un
 * écran à venir n'en a pas encore, et qu'aucune page n'échappe à cet inventaire.
 *
 * Module pur : ni React, ni Next. Importé par le shell, les écrans, `e2e/routes.ts`.
 */

/** Présentation d'un écran à ce jour. `provisoire` : page d'attente navigable (07 J4). */
export type RouteState = "a-venir" | "provisoire" | "livree";

export type RouteSpec = {
  /** Identifiant d'écran de 06 §3 (E01…). */
  readonly screen: string;
  /** Motif au format des dossiers de `app/` (`/admin/clients/[id]`). */
  readonly pattern: `/admin${string}`;
  /** Paramètres d'URL reconnus (06 §1.2), hors paramètres de sheet. */
  readonly params: readonly string[];
  /** Rendu dans le shell (groupe `(gestion)`) ; E18 est hors shell. */
  readonly shell: boolean;
  /** Jalon de 07 qui livre l'écran définitif. */
  readonly jalon: string;
  readonly etat: RouteState;
};

const spec = (s: RouteSpec) => s;

/** Inventaire de 06 §1.2, une entrée par constructeur (mêmes clés que `routes`). */
export const ROUTE_SPECS = {
  accueil: spec({ screen: "E01", pattern: "/admin", params: [], shell: true, jalon: "J14", etat: "livree" }),
  // E02 était prévu à J15 (07 §3.4) ; livré à J14 avec le bloc « Aujourd'hui » de E01, sans quoi le récap du
  // jour n'a aucun chemin d'accès et PC-09 (« bilan du jour en 1 tap ») ne tient pas. 07 J14 amendé.
  journee: spec({ screen: "E02", pattern: "/admin/journee", params: ["jour"], shell: true, jalon: "J14", etat: "livree" }),
  compta: spec({
    screen: "E03",
    pattern: "/admin/compta",
    params: ["vue", "periode", "ref", "q", "filtre"],
    shell: true,
    jalon: "J12",
    etat: "livree",
  }),
  journal: spec({ screen: "E04", pattern: "/admin/compta/journal", params: ["mois", "poche"], shell: true, jalon: "J12", etat: "livree" }),
  /**
   * `q` et `pages` : la recherche et la pagination de la zone 0 « À rattacher » (écart du 17/09/2026).
   * Elles sont dans l'URL et non dans l'état du composant parce que la liste est paginée EN BASE : un
   * filtre local ne verrait que les 100 premières lignes, et le compte affiché mentirait.
   */
  lots: spec({ screen: "E05", pattern: "/admin/lots", params: ["q", "pages"], shell: true, jalon: "J13", etat: "livree" }),
  lot: spec({ screen: "E06", pattern: "/admin/lots/[id]", params: ["assigner"], shell: true, jalon: "J13", etat: "livree" }),
  nouveauLot: spec({ screen: "E21", pattern: "/admin/lots/nouveau", params: [], shell: true, jalon: "J13", etat: "livree" }),
  statistiques: spec({
    screen: "E07",
    pattern: "/admin/statistiques",
    params: ["periode", "ref", "pages"],
    shell: true,
    jalon: "J14",
    etat: "livree",
  }),
  reglages: spec({ screen: "E08", pattern: "/admin/reglages", params: [], shell: true, jalon: "J15", etat: "a-venir" }),
  commandes: spec({ screen: "E10", pattern: "/admin/commandes", params: ["vue", "filtre", "q", "pages"], shell: true, jalon: "J8", etat: "livree" }),
  vendre: spec({
    screen: "E11",
    pattern: "/admin/vendre",
    params: ["mode", "client", "parfum", "depuis"],
    shell: true,
    jalon: "J9",
    etat: "livree",
  }),
  clients: spec({ screen: "E12", pattern: "/admin/clients", params: ["q", "pages"], shell: true, jalon: "J10", etat: "livree" }),
  encaisser: spec({ screen: "E13", pattern: "/admin/encaisser", params: ["anciennete", "q"], shell: true, jalon: "J8", etat: "livree" }),
  client: spec({ screen: "E14", pattern: "/admin/clients/[id]", params: ["pages"], shell: true, jalon: "J10", etat: "livree" }),
  modifierClient: spec({ screen: "E20", pattern: "/admin/clients/[id]/modifier", params: [], shell: true, jalon: "J10", etat: "livree" }),
  nouveauClient: spec({ screen: "E20", pattern: "/admin/clients/nouveau", params: ["nom"], shell: true, jalon: "J10", etat: "livree" }),
  catalogue: spec({
    screen: "E15",
    pattern: "/admin/catalogue",
    params: ["tab", "q", "stock", "visibilite", "gamme"],
    shell: true,
    jalon: "J11",
    etat: "livree",
  }),
  parfum: spec({ screen: "E16", pattern: "/admin/catalogue/parfums/[id]", params: [], shell: true, jalon: "J11", etat: "livree" }),
  modifierParfum: spec({
    screen: "E19",
    pattern: "/admin/catalogue/parfums/[id]/modifier",
    params: [],
    shell: true,
    jalon: "J11",
    etat: "livree",
  }),
  nouveauParfum: spec({
    screen: "E19",
    pattern: "/admin/catalogue/parfums/nouveau",
    params: ["dupliquer"],
    shell: true,
    jalon: "J11",
    etat: "livree",
  }),
  modifierMarque: spec({
    screen: "E17",
    pattern: "/admin/catalogue/marques/[id]/modifier",
    params: [],
    shell: true,
    jalon: "J11",
    etat: "livree",
  }),
  nouvelleMarque: spec({ screen: "E17", pattern: "/admin/catalogue/marques/nouvelle", params: [], shell: true, jalon: "J11", etat: "livree" }),
  connexion: spec({ screen: "E18", pattern: "/admin/login", params: ["retour"], shell: false, jalon: "J4", etat: "livree" }),
} as const satisfies Record<string, RouteSpec>;

export type RouteName = keyof typeof ROUTE_SPECS;

/**
 * Paramètres qui ouvrent une sheet (06 §1.3) : acceptés sur toute route du shell, ils ne comptent
 * jamais pour l'onglet, le retour ni la mémoire d'onglet.
 */
export const SHEET_PARAMS = ["doc", "edition", "assigner"] as const;

type QueryValue = string | number | boolean | null | undefined;

/** `true` s'écrit `1` ; `false`, `null`, `undefined` et la chaîne vide ne s'écrivent pas. */
function build(pathname: string, query?: Record<string, QueryValue>): string {
  if (!query) return pathname;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === false || value === "") continue;
    params.set(key, value === true ? "1" : String(value));
  }
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

const segment = (id: string | number) => encodeURIComponent(String(id));

export type DocumentOrigin = "ORDER" | "DIRECT_SALE";
export type Periode = "jour" | "semaine" | "mois" | "annee" | "tout";

export const routes = {
  accueil: () => "/admin",
  journee: (q?: { jour?: string }) => build("/admin/journee", q),
  compta: (q?: {
    vue?: "ventes" | "tresorerie";
    periode?: Periode;
    ref?: string;
    q?: string;
    filtre?: "cout-a-completer";
  }) => build("/admin/compta", q),
  journal: (q?: { mois?: string; poche?: string }) => build("/admin/compta/journal", q),
  /** `pages` : « Afficher plus » de la zone « À rattacher » ; 1 ne s'écrit pas. */
  lots: (q?: { q?: string; pages?: number }) =>
    build("/admin/lots", q ? { ...q, pages: q.pages && q.pages > 1 ? q.pages : undefined } : q),
  lot: (id: string, q?: { assigner?: boolean }) => build(`/admin/lots/${segment(id)}`, q),
  nouveauLot: () => "/admin/lots/nouveau",
  /** « Afficher plus » du classement : `pages` pages de 20 lignes ; 1 ne s'écrit pas (06 E07). */
  statistiques: (q?: { periode?: Periode; ref?: string; pages?: number }) =>
    build("/admin/statistiques", q ? { ...q, pages: q.pages && q.pages > 1 ? q.pages : undefined } : q),
  reglages: () => "/admin/reglages",
  commandes: (q?: {
    vue?: "a-livrer" | "livrees" | "annulees";
    filtre?: "retard" | "aujourdhui" | "demain" | "en-attente" | "confirmees";
    q?: string;
    /** « Afficher plus » (Livrées, Annulées) : nombre de pages de 50 affichées ; 1 ne s'écrit pas. */
    pages?: number;
  }) => build("/admin/commandes", q ? { ...q, pages: q.pages && q.pages > 1 ? q.pages : undefined } : q),
  vendre: (q?: { mode?: "vente" | "commande"; client?: string; parfum?: string | number; depuis?: string }) =>
    build("/admin/vendre", q),
  /** « Afficher plus » : `pages` pages de 50 fiches affichées ; 1 ne s'écrit pas. */
  clients: (q?: { q?: string; pages?: number }) =>
    build("/admin/clients", q ? { ...q, pages: q.pages && q.pages > 1 ? q.pages : undefined } : q),
  encaisser: (q?: { anciennete?: 30; q?: string }) => build("/admin/encaisser", q),
  /** « Afficher plus » de l'historique : `pages` pages de 20 documents ; 1 ne s'écrit pas. */
  client: (id: string, q?: { pages?: number }) =>
    build(`/admin/clients/${segment(id)}`, q?.pages && q.pages > 1 ? { pages: q.pages } : undefined),
  modifierClient: (id: string) => `/admin/clients/${segment(id)}/modifier`,
  nouveauClient: (q?: { nom?: string }) => build("/admin/clients/nouveau", q),
  catalogue: (q?: {
    tab?: "parfums" | "marques" | "en-avant";
    q?: string;
    stock?: "bas" | "rupture";
    visibilite?: "masques";
    /** Onglet Marques : les gammes complètes seulement (chip « Gammes complètes », 06 E15). */
    gamme?: "complete";
  }) => build("/admin/catalogue", q),
  parfum: (id: string | number) => `/admin/catalogue/parfums/${segment(id)}`,
  modifierParfum: (id: string | number) => `/admin/catalogue/parfums/${segment(id)}/modifier`,
  nouveauParfum: (q?: { dupliquer?: string | number }) => build("/admin/catalogue/parfums/nouveau", q),
  modifierMarque: (id: string) => `/admin/catalogue/marques/${segment(id)}/modifier`,
  nouvelleMarque: () => "/admin/catalogue/marques/nouvelle",
  /** E18. `retour` : écran à rouvrir après connexion (validé par le serveur, `safeReturnPath`). */
  connexion: (q?: { retour?: string }) => build("/admin/login", q),
  /**
   * Fiche document (A-3) : une sheet adressable, jamais une page. Elle s'ouvre au-dessus de sa liste
   * d'origine ; pour l'ouvrir sur l'écran courant, `withSheet(urlCourante, { doc })`.
   */
  document: (d: { id: string; origin: DocumentOrigin; edition?: boolean }) =>
    build(d.origin === "ORDER" ? "/admin/commandes" : "/admin/compta", { doc: d.id, edition: d.edition }),
} as const satisfies Record<RouteName | "document", (...args: never[]) => string>;

const BASE = "https://nurea.invalid";

/** Ajoute ou retire les paramètres de sheet d'une URL (chemin + query), sans toucher au reste. */
export function withSheet(url: string, sheet: { doc?: string | null; edition?: boolean; assigner?: boolean }): string {
  const parsed = new URL(url, BASE);
  if (sheet.doc !== undefined) {
    if (sheet.doc) parsed.searchParams.set("doc", sheet.doc);
    else parsed.searchParams.delete("doc");
  }
  if (sheet.edition !== undefined) {
    if (sheet.edition) parsed.searchParams.set("edition", "1");
    else parsed.searchParams.delete("edition");
  }
  if (sheet.assigner !== undefined) {
    if (sheet.assigner) parsed.searchParams.set("assigner", "1");
    else parsed.searchParams.delete("assigner");
  }
  return `${parsed.pathname}${parsed.search}`;
}

/** L'URL sans aucun paramètre de sheet : ce que retiennent la mémoire d'onglet et le retour. */
export function withoutSheet(url: string): string {
  const parsed = new URL(url, BASE);
  for (const key of SHEET_PARAMS) parsed.searchParams.delete(key);
  return `${parsed.pathname}${parsed.search}`;
}

/** Correspondance d'un chemin concret avec un motif `[id]` (un segment non vide). */
export function matchesPattern(pathname: string, pattern: string): boolean {
  const path = pathname.split("/");
  const parts = pattern.split("/");
  if (path.length !== parts.length) return false;
  return parts.every((part, i) => {
    const actual = path[i] as string;
    return /^\[\w+\]$/.test(part) ? actual.length > 0 : part === actual;
  });
}

/** Spécification de l'écran d'un chemin (sans query), ou `null` s'il est hors inventaire. */
export function routeOf(pathOrUrl: string): { name: RouteName; spec: RouteSpec } | null {
  const pathname = new URL(pathOrUrl, BASE).pathname;
  // Motifs statiques d'abord : `/admin/clients/nouveau` n'est pas la fiche du client « nouveau ».
  const entries = (Object.entries(ROUTE_SPECS) as [RouteName, RouteSpec][]).sort(
    ([, a], [, b]) => Number(a.pattern.includes("[")) - Number(b.pattern.includes("[")),
  );
  const hit = entries.find(([, s]) => matchesPattern(pathname, s.pattern));
  return hit ? { name: hit[0], spec: hit[1] } : null;
}

/** Vrai si l'écran de cette URL a une page (définitive ou provisoire) : un lien peut y mener. */
export function isNavigable(url: string): boolean {
  const route = routeOf(url);
  return route !== null && route.spec.etat !== "a-venir";
}
