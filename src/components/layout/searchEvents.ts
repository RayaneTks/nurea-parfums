/**
 * Les événements qui relient la barre haute (`Navbar`, `SearchBox`) au catalogue de l'accueil
 * (`CatalogSection`). Un fichier à part : la barre et le catalogue s'importent sans se croiser.
 */

/** Écouté par `CatalogSection` pour ouvrir les filtres (bouton retiré de la barre en T5, filtres refaits en T11). */
export const OPEN_CATALOG_FILTERS_EVENT = "nurea:open-catalog-filters";

/**
 * Recherche en direct sur l'accueil : la barre diffuse la saisie (`detail` = requête, vide sous
 * 2 caractères), le catalogue filtre ; en retour, le catalogue diffuse sa requête quand elle change
 * sans la barre (puce retirée, « Tout effacer »). Hors accueil, le champ envoie `/?q=`.
 */
export const SEARCH_EVENT = "nurea:search";
export const QUERY_SYNC_EVENT = "nurea:query";

/**
 * La recherche est **validée** (touche « Rechercher » du clavier, rangée « Voir les N parfums ») : le
 * catalogue vient alors en vue. Taper seul ne fait que filtrer (`SEARCH_EVENT`) — défiler à chaque lettre,
 * champ actif et clavier ouvert, faisait remonter la page en haut à chaque frappe sur téléphone (le
 * navigateur ramène en vue le champ de la barre collée), puis redescendre : la page « glitchait » (22/10).
 */
export const SHOW_RESULTS_EVENT = "nurea:show-results";

/** En deçà, une requête est trop vague pour filtrer ou suggérer (04-PLAN-EXECUTION § B : dès 2 caractères). */
export const MIN_LIVE_QUERY = 2;

/** Diffusé par le cœur de la barre sur l'accueil ; la feuille « Ma sélection » y vit (avec le catalogue). */
export const OPEN_SELECTION_EVENT = "nurea:open-selection";
