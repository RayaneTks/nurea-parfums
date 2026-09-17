import { ROUTE_SPECS, routes, type RouteName } from "../src/app-shell/routes";
import { SESSION_HINT_COOKIE } from "../src/app-shell/session-hint";

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
};

export type SheetCase = {
  /** Sheet ou dialogue de 06 (S17…). */
  sheet: string;
  label: string;
  /** Écran sous-jacent. */
  url: string;
  /** Ouvre la sheet sur l'écran chargé. */
  open: "search";
  keyboardFields?: string[];
};

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
  { screen: "E10", route: "commandes", label: "Commandes provisoire", url: routes.commandes(), shell: true },
  { screen: "E11", route: "vendre", label: "Vendre provisoire", url: routes.vendre(), shell: true },
  { screen: "E12", route: "clients", label: "Clients provisoire", url: routes.clients(), shell: true },
  { screen: "E15", route: "catalogue", label: "Catalogue provisoire", url: routes.catalogue(), shell: true },
];

export const SHEETS: SheetCase[] = [
  { sheet: "S17", label: "recherche ouverte", url: routes.accueil(), open: "search", keyboardFields: ["Rechercher"] },
  { sheet: "S17", label: "recherche ouverte hors racine", url: routes.clients({ q: "fa" }), open: "search", keyboardFields: ["Rechercher"] },
];

/** Écrans livrés (définitifs ou provisoires) de `routes.ts` qui n'ont aucun cas ici. */
export function uncoveredRoutes(): RouteName[] {
  const covered = new Set(SCREENS.map((c) => c.route));
  return (Object.keys(ROUTE_SPECS) as RouteName[]).filter((name) => ROUTE_SPECS[name].etat !== "a-venir" && !covered.has(name));
}
