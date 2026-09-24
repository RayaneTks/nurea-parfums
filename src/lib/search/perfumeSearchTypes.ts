/**
 * Contrat JSON de l’orchestrateur de recherche (route /api/perfume-search).
 * Prévu pour évoluer (ex. import catalogue depuis suggestion.externalId).
 *
 * Types autonomes (sans importer le catalogue) pour limiter le bundle client.
 */

export type PerfumeSearchResponse =
  | PerfumeSearchLocalResults
  | PerfumeSearchUnlistedMatch
  | PerfumeSearchExternalSuggestion
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

export interface ExternalPerfumeSuggestion {
  name: string;
  brand: string;
  externalId: string;
  /** Origine de la suggestion (ex. `external_api`, fournisseur). */
  source?: string;
  /** Payload brut pour un futur import automatique (mapper côté service d’import). */
  raw?: Record<string, unknown>;
}

export interface PerfumeSearchExternalSuggestion {
  type: "external_suggestion";
  query: string;
  suggestion: ExternalPerfumeSuggestion;
}

export interface PerfumeSearchNoResults {
  type: "no_results";
  query: string;
}
