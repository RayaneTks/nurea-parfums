/**
 * Types partagés pour la base « hors catalogue » (recherche anticipée).
 */

export interface ExternalPerfumeHint {
  id: string;
  queries: string[];
  displayName: string;
  caption?: string;
  similarCatalogIds: number[];
  /**
   * Par défaut : court complément sous la caption (ton conciergerie, sans contredire la caption).
   * `none` : ne rien afficher sous la caption (caption déjà suffisante).
   * `legacy-offline` : message « pas en fiche individuelle sur la vitrine » — seulement si cohérent avec la caption.
   */
  footnote?: "default" | "none" | "legacy-offline";
}
