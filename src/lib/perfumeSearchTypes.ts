/**
 * Contrat JSON de l’orchestrateur de recherche (route /api/perfume-search).
 * Prévu pour évoluer (ex. import catalogue depuis suggestion.externalId).
 *
 * Types autonomes (sans importer le catalogue) pour limiter le bundle client.
 */

export type PerfumeSearchResponse =
  | PerfumeSearchLocalResults
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

export interface ExternalPerfumeSuggestion {
  name: string;
  brand: string;
  externalId: string;
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
