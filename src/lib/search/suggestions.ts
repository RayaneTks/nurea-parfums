import type { Category } from "../data";
import { brandSlug } from "../slugify";
import { perfumePath } from "../seo/paths";
import { formatExternalSuggestionDisplay } from "./formatExternalSuggestionDisplay";
import type { PerfumeSearchResponse } from "./perfumeSearchTypes";

/** Un parfum proposé sous le champ : de quoi montrer son visuel, le nommer et ouvrir sa fiche. */
export interface PerfumeSuggestion {
  id: number;
  name: string;
  brand: string;
  line?: string;
  category: Category;
  image: string;
  imageLight?: string;
  /** Page indexable du parfum (`/parfums/<marque>/<nom>-<id>`) : le lien réel de la rangée. */
  href: string;
}

/**
 * Quand aucun parfum du catalogue ne répond : qui l'on croit que le visiteur cherche, et la demande
 * de contact pré-remplie. `brandOnly` : la saisie ne vise qu'une marque, on ne nomme pas un parfum
 * pris au hasard.
 */
export interface AskSuggestion {
  name: string;
  brand?: string;
  brandOnly: boolean;
  href: string;
}

export interface SearchSuggestions {
  perfumes: PerfumeSuggestion[];
  /** Nombre total de parfums du catalogue qui répondent (la rangée « Voir les N parfums »). */
  total: number;
  ask: AskSuggestion | null;
}

/** Le plus de parfums montrés sous le champ : au-delà, « Voir les N parfums » mène à la grille. */
export const MAX_SUGGESTIONS = 5;

/** Contact pré-rempli (`?parfum=…&marque=…`), sinon la page Contact nue. */
export function contactHref(params: { parfum?: string; marque?: string }): string {
  const search = new URLSearchParams();
  if (params.parfum) search.set("parfum", params.parfum);
  if (params.marque) search.set("marque", params.marque);
  const query = search.toString();
  return query ? `/contact?${query}` : "/contact";
}

function ask(match: { name: string; brand?: string; on?: "perfume" | "brand" }): AskSuggestion {
  const brandOnly = match.on === "brand" && !!match.brand;
  return {
    name: match.name,
    brand: match.brand,
    brandOnly,
    href: contactHref(brandOnly ? { marque: match.brand } : { parfum: match.name, marque: match.brand }),
  };
}

/**
 * Ce que la barre propose pour une réponse de `/api/perfume-search` — la même chaîne que la grille
 * vide (`CatalogEmptyState`), en une rangée : des parfums du catalogue, sinon la référence reconnue
 * (au catalogue sans carte, au répertoire, ailleurs), sinon la saisie telle quelle. Jamais le vide.
 */
export function suggestionsFromResponse(response: PerfumeSearchResponse, query: string): SearchSuggestions {
  const trimmed = query.trim();
  switch (response.type) {
    case "local_results": {
      const perfumes = response.results.slice(0, MAX_SUGGESTIONS).map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        line: item.line,
        category: "Tout voir" as const,
        image: item.image,
        imageLight: item.imageLight,
        href: perfumePath(item.brandSlug ?? brandSlug(item.brand), item.name, item.id),
      }));
      return { perfumes, total: response.results.length, ask: null };
    }
    case "unlisted_match":
      return { perfumes: [], total: 0, ask: ask(response.match) };
    case "reference_match":
      return {
        perfumes: [],
        total: 0,
        ask: ask({ ...response.match, brand: response.match.line ? `${response.match.brand} (${response.match.line})` : response.match.brand }),
      };
    case "external_suggestion": {
      const { suggestion } = response;
      const brand = suggestion.brand && suggestion.brand !== "—" ? suggestion.brand : undefined;
      return { perfumes: [], total: 0, ask: ask({ name: formatExternalSuggestionDisplay(suggestion, trimmed), brand }) };
    }
    case "no_results":
      return { perfumes: [], total: 0, ask: ask({ name: trimmed }) };
  }
}

/** La recherche élargie ne répond pas : la saisie part telle quelle dans la demande. */
export function suggestionsForQuery(query: string): SearchSuggestions {
  return { perfumes: [], total: 0, ask: ask({ name: query.trim() }) };
}
