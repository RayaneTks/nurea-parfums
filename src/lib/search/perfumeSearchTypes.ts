/**
 * Contrat JSON de l’orchestrateur de recherche (route /api/perfume-search).
 *
 * Types autonomes (sans importer le catalogue) pour limiter le bundle client.
 */

export type PerfumeSearchResponse =
  | PerfumeSearchLocalResults
  | PerfumeSearchUnlistedMatch
  | PerfumeSearchReferenceMatch
  | PerfumeSearchNoResults;

/** Sous-ensemble des champs catalogue exposés dans la réponse API. */
export interface PerfumeSearchCatalogItem {
  id: number;
  name: string;
  brand: string;
  category: string;
  image: string;
  imageLight?: string;
  imageDark?: string;
  tags?: string[];
  aliases?: string[];
  classics?: string[];
}

export interface PerfumeSearchLocalResults {
  type: "local_results";
  query: string;
  results: PerfumeSearchCatalogItem[];
}

/**
 * Référence au catalogue sans carte sur la vitrine (masquée, visuel pas encore prêt). Seuls le nom et la
 * marque sont exposés : la vitrine invite à écrire sans affirmer ni nier la disponibilité.
 */
export interface PerfumeSearchUnlistedMatch {
  type: "unlisted_match";
  query: string;
  /** `brand` : la saisie ne vise que la marque (« xerjoff ») — on parle de la marque, pas d'un parfum pris au hasard. */
  match: { name: string; brand: string; on: "perfume" | "brand" };
}

/**
 * Référence reconnue dans le référentiel des marques et parfums du monde, mais absente du catalogue :
 * la vitrine dit qu'elle n'est peut-être pas encore ajoutée et invite à écrire. `brand` : la saisie
 * ne vise que la marque.
 */
export interface PerfumeSearchReferenceMatch {
  type: "reference_match";
  query: string;
  match: { kind: "perfume"; name: string; brand: string } | { kind: "brand"; brand: string };
}

export interface PerfumeSearchNoResults {
  type: "no_results";
  query: string;
}
