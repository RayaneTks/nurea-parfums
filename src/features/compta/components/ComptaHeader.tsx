"use client";

import { SearchField } from "@/ui/primitives/SearchField";

type ComptaHeaderProps = {
  query: string;
  onQueryChange: (next: string) => void;
};

/**
 * Recherche de la vue Ventes.
 *
 * Le titre et les actions de page vivent dans `ComptaWithTreasury` : ils sont
 * communs aux deux vues, alors que cette recherche ne filtre que les ventes.
 */
export function ComptaHeader({ query, onQueryChange }: ComptaHeaderProps) {
  return (
    <SearchField
      value={query}
      onChange={onQueryChange}
      placeholder="Rechercher un client…"
    />
  );
}
