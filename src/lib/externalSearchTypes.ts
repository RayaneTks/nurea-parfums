/**
 * Types partagés pour la base « hors catalogue » (recherche anticipée).
 */

export interface ExternalPerfumeHint {
  id: string;
  queries: string[];
  displayName: string;
  caption?: string;
  similarCatalogIds: number[];
}
